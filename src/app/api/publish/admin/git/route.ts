/**
 * Git Admin API Route
 * GET /api/publish/admin/git - Get Git status and recovery information
 * POST /api/publish/admin/git - Administrative Git operations
 * 
 * This endpoint provides observability and recovery capabilities.
 * 
 * RULES:
 * - Only authenticated editors can access
 * - No destructive operations exposed
 * - Provides recovery information
 */

import { NextRequest, NextResponse } from 'next/server';
import { gitService } from '@/lib/git';
import { verifyAuth } from '@/lib/auth/session';

/**
 * User-friendly response helper
 */
function userResponse(
    success: boolean,
    message: string,
    data?: Record<string, unknown>,
    status: number = success ? 200 : 400
) {
    return NextResponse.json(
        {
            success,
            message,
            ...(data && { data }),
        },
        { status }
    );
}

/**
 * GET - Get Git status and system health
 * Returns:
 * - Current branch
 * - Uncommitted changes status
 * - Last sync status
 */
export async function GET(): Promise<NextResponse> {
    try {
        // Enforce strict session
        try {
            await verifyAuth();
        } catch {
            return userResponse(false, 'Session expired.', undefined, 401);
        }

        let currentBranch = 'unknown';
        let hasUncommittedChanges = false;
        let isHealthy = true;
        const issues: string[] = [];

        try {
            currentBranch = await gitService.getCurrentBranch();
        } catch (error) {
            console.error('Failed to get current branch:', error);
            isHealthy = false;
            issues.push('Could not determine current branch');
        }

        try {
            hasUncommittedChanges = await gitService.hasUncommittedChanges();
        } catch (error) {
            console.error('Failed to check uncommitted changes:', error);
            isHealthy = false;
            issues.push('Could not check for pending changes');
        }

        return userResponse(
            true,
            isHealthy ? 'System is healthy.' : 'System has issues.',
            {
                currentBranch,
                hasUncommittedChanges,
                isHealthy,
                issues,
                timestamp: new Date().toISOString(),
            }
        );

    } catch (error) {
        console.error('Git admin status error:', error);
        return userResponse(
            false,
            'Could not retrieve system status.',
            undefined,
            500
        );
    }
}

/**
 * POST - Administrative operations
 * Actions:
 * - sync: Pull and push to ensure Git is in sync
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce strict session
        try {
            await verifyAuth();
        } catch {
            return userResponse(false, 'Session expired.', undefined, 401);
        }
        const body = await request.json();
        const { action } = body;

        if (action === 'sync') {
            // Pull latest changes
            try {
                await gitService.pull();
            } catch (error) {
                console.error('Pull failed:', error);
                // Continue - push may still work
            }

            // Push any local changes
            try {
                await gitService.push();
            } catch (error) {
                console.error('Push failed:', error);
                return userResponse(
                    false,
                    'Sync partially completed. Local changes may not be uploaded.',
                    undefined,
                    500
                );
            }

            return userResponse(
                true,
                'Sync completed successfully.',
                { syncedAt: new Date().toISOString() }
            );
        }

        return userResponse(
            false,
            'Unknown action. Available actions: sync',
            undefined,
            400
        );

    } catch (error) {
        console.error('Git admin action error:', error);
        return userResponse(
            false,
            'Could not complete the action.',
            undefined,
            500
        );
    }
}
