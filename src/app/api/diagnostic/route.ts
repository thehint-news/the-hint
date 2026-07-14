import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { gitService } from '@/lib/git/service';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await verifyAuth();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const report: {
        success: boolean;
        timestamp: string;
        checks: Record<string, { status: string; data?: unknown; error?: string; reason?: string }>;
    } = {
        success: true,
        timestamp: new Date().toISOString(),
        checks: {},
    };

    let allChecksPassed = true;

    const check = async (name: string, operation: () => Promise<unknown>) => {
        try {
            const data = await operation();
            report.checks[name] = { status: 'pass', data };
        } catch (error: unknown) {
            report.checks[name] = { status: 'fail', error: error instanceof Error ? error.message : String(error) };
            allChecksPassed = false;
        }
    };

    // 1. Environment & Token
    await check('environment', async () => {
        if (!process.env.GIT_TOKEN) throw new Error('GIT_TOKEN is missing');
        if (!process.env.GIT_REPO_OWNER) throw new Error('GIT_REPO_OWNER is missing');
        if (!process.env.GIT_REPO_NAME) throw new Error('GIT_REPO_NAME is missing');
        return {
            owner: process.env.GIT_REPO_OWNER,
            repo: process.env.GIT_REPO_NAME,
        };
    });

    // 2. Repository Accessibility & Branch existence & HEAD SHA
    if (report.checks['environment']?.status === 'pass') {
        await check('github_connection', async () => {
            const client = (gitService as unknown as { octokit: import('octokit').Octokit }).octokit;
            const branch = await gitService.getCurrentBranch();
            const ref = await client.rest.git.getRef({
                owner: process.env.GIT_REPO_OWNER!,
                repo: process.env.GIT_REPO_NAME!,
                ref: `heads/${branch}`,
            });
            return {
                branch,
                head_sha: (ref.data.object as { sha: string }).sha,
            };
        });
    } else {
        report.checks['github_connection'] = { status: 'skip', reason: 'Environment check failed' };
    }

    // 3. Required Paths Verification
    await check('local_paths', async () => {
        const paths = [
            'src/content',
            'src/content/drafts',
        ];
        const missing = [];
        for (const p of paths) {
            const fullPath = path.join(process.cwd(), p);
            if (!fs.existsSync(fullPath)) {
                missing.push(p);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing local paths: ${missing.join(', ')}`);
        }
        return { verified_paths: paths };
    });

    report.success = allChecksPassed;
    return NextResponse.json(report, { status: allChecksPassed ? 200 : 503 });
}
