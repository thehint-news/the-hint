
import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/subscription/queue';
import { validateSubscriptionEnv } from '@/lib/env';
import { getActiveSubscribers } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
    try {
        const envValidation = validateSubscriptionEnv();

        const queueStatus = await queueManager.getStatus();

        let subscriberCount = 0;
        let subscriberError = null;
        try {
            const subscribers = await getActiveSubscribers();
            subscriberCount = subscribers.length;
        } catch (error) {
            subscriberError = String(error);
            logger.error(`[HEALTH] Failed to get subscribers: ${error}`);
        }

        const isHealthy = envValidation.valid && !subscriberError;

        return NextResponse.json({
            success: true,
            healthy: isHealthy,
            environment: {
                valid: envValidation.valid,
                missing: envValidation.missing,
            },
            subscribers: {
                count: subscriberCount,
                error: subscriberError,
                path: 'src/data/subscribers.json'
            },
            queue: queueStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[HEALTH] Status check failed:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve status' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'pause') {
            await queueManager.pauseQueue();
            return NextResponse.json({ success: true, message: 'Queue paused' });
        } else if (action === 'resume') {
            await queueManager.resumeQueue();
            return NextResponse.json({ success: true, message: 'Queue resumed' });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "pause" or "resume".' },
                { status: 400 }
            );
        }
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}
