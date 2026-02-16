import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/auth/token';
import { createSession } from '@/lib/auth/session';
import { gitService } from '@/lib/git/service';

const USED_TOKENS_PATH = 'src/lib/auth/used-tokens.json';

async function isTokenUsed(jti: string): Promise<boolean> {
    try {
        const data = await gitService.readFile(USED_TOKENS_PATH);
        if (!data) return false;
        const usedTokens = JSON.parse(data);
        return !!usedTokens[jti];
    } catch (error: unknown) {
        const err = error as { code?: string; name?: string };
        if (err.code === 'ENOENT' || err.name === 'NotFoundError') {
            return false;
        }
        console.error('[AUTH-VERIFY] Failed to parse used-tokens.json. Failing closed to prevent replay.', error);
        return true;
    }
}

async function markTokenAsUsed(jti: string) {
    try {
        let usedTokens: Record<string, number> = {};
        const data = await gitService.readFile(USED_TOKENS_PATH);
        if (data) {
            try {
                usedTokens = JSON.parse(data);
            } catch {
                usedTokens = {};
            }
        }

        // Add new token with timestamp
        usedTokens[jti] = Date.now();

        // Cleanup old tokens (> 24h) to keep file small
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const cleanedTokens = Object.fromEntries(
            Object.entries(usedTokens).filter(([, timestamp]) => timestamp > oneDayAgo)
        );

        await gitService.saveFile(USED_TOKENS_PATH, JSON.stringify(cleanedTokens, null, 2), `Auth: mark token ${jti} as used`);
    } catch (error) {
        console.error('Failed to mark token as used:', error);
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    // SCENARIO 1: Localhost / Development
    const isDevBypass = isDev && !cronSecret;

    // Check for cron job authentication ONLY if a secret is provided OR we are testing in dev
    if (secret || isDevBypass) {
        if (isDevBypass || (cronSecret && secret === cronSecret)) {
            // This route is also used by cron jobs to process the queue.
            // If a secret is provided and matches (or we bypass in dev), we assume it's a cron job
            // and return a success response without further processing.
            // The actual queue processing logic is handled elsewhere.
            return NextResponse.json({ success: true, message: 'Cron job secret received.' });
        } else {
            // Secret provided but incorrect
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }
    // If no secret provided, proceed to Magic Link verification below

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/newsroom?error=Missing+token', request.url));
    }

    const payload = await verifyMagicToken(token);

    if (!payload || !payload.email) {
        return NextResponse.redirect(new URL('/newsroom?error=Invalid+or+expired+link', request.url));
    }

    const authorizedEmail = process.env.AUTHORIZED_EDITOR_EMAIL;
    if (payload.email !== authorizedEmail) {
        return NextResponse.redirect(new URL('/newsroom?error=Unauthorized+email', request.url));
    }

    // Check for reuse
    if (payload.jti && await isTokenUsed(payload.jti)) {
        return NextResponse.redirect(new URL('/newsroom?error=Link+already+used', request.url));
    }

    if (payload.jti) {
        await markTokenAsUsed(payload.jti);
    }

    // Create session
    await createSession(payload.email);

    // Redirect to publish
    return NextResponse.redirect(new URL('/publish', request.url));
}
