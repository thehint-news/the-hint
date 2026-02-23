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
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const timestamp = new Date().toISOString();

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json(
                { success: false, error: 'Invalid email address' },
                { status: 400 }
            );
        }

        const envValidation = validateSubscriptionEnv();
        if (!envValidation.valid) {
            logger.error(`[SUBSCRIBE] Missing environment variables: ${envValidation.missing.join(', ')}`);
            return NextResponse.json(
                { success: false, error: 'System configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        const result = await addSubscriber(email);

        if (!result.success) {
            logger.error(`[SUBSCRIBE] Storage failed for ${email}: ${result.message}`);
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }

        logger.info(`[SUBSCRIBE] Stored: ${email} at ${timestamp}, duplicate: ${result.isDuplicate || false}, storageSuccess: ${result.storageSuccess}`);

        if (!result.isDuplicate) {
            try {
                const { sendWelcomeEmail } = await import('@/lib/welcomeEmail');
                await sendWelcomeEmail(email);
                logger.info(`[SUBSCRIBE] Welcome email sent successfully to ${email}`);
            } catch (err) {
                logger.error(`[SUBSCRIBE] Failed to send welcome email to ${email}`, err);
            }
        } else {
            logger.info(`[SUBSCRIBE] Skipped welcome email - duplicate subscription: ${email}`);
        }

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
