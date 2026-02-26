import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';
import { validateSubscriptionEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;
const rateLimitMap = new Map<string, { count: number; expires: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (now > record.expires) {
        rateLimitMap.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (record.count >= MAX_REQUESTS) {
        return true;
    }

    record.count++;
    return false;
}

export async function POST(request: NextRequest) {
    logger.info('[SUBSCRIBE] Checkpoint: API route entered');
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (isRateLimited(ip)) {
        logger.error(`[SUBSCRIBE] Checkpoint: Rate limited IP ${ip}`);
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { email } = body;

        // Validation
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            logger.error('[SUBSCRIBE] Checkpoint: Invalid email address');
            return NextResponse.json(
                { success: false, error: 'Invalid email address' },
                { status: 400 }
            );
        }
        logger.info(`[SUBSCRIBE] Checkpoint: Email validated (${email})`);

        // Environment variables
        const envValidation = validateSubscriptionEnv();
        if (!envValidation.valid) {
            logger.error(`[SUBSCRIBE] Fatal config error. Missing environment variables: ${envValidation.missing.join(', ')}`);
            return NextResponse.json(
                { success: false, error: 'System configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        const result = await addSubscriber(email);

        if (!result.success) {
            logger.error(`[SUBSCRIBE] Storage failed for ${email}: ${result.error || result.message}`);
            // Check if it's a duplicate and return 409
            if (result.isDuplicate) {
                return NextResponse.json(
                    { success: false, error: 'Already subscribed' },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }

        if (!result.isDuplicate) {
            try {
                logger.info(`[SUBSCRIBE] Checkpoint: Welcome email sending started`);
                const { sendWelcomeEmail } = await import('@/lib/welcomeEmail');
                await sendWelcomeEmail(email);
                logger.info(`[SUBSCRIBE] Checkpoint: Welcome email sent successfully`);
            } catch (err) {
                logger.error(`[SUBSCRIBE] Failed to send welcome email to ${email}`, err);
                // We still want to return a success to the frontend if subscription was saved securely in git
            }
        } else {
            logger.info(`[SUBSCRIBE] Skipped welcome email - duplicate subscription: ${email}`);
        }

        logger.info(`[SUBSCRIBE] Checkpoint: Final success response`);
        return NextResponse.json(
            { success: true, message: result.message },
            { status: 200 }
        );
    } catch (error) {
        logger.error('[SUBSCRIBE] Unexpected error', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
