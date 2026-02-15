import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';

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

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { email } = body;

        // Basic validation
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json(
                { success: false, error: 'Invalid email address' },
                { status: 400 }
            );
        }

        const result = await addSubscriber(email);

        if (result.success && !result.isDuplicate) {
            // Send Welcome Email (async, fire and forget)
            import('@/lib/welcomeEmail').then(mod => mod.sendWelcomeEmail(email)).catch(err => logger.error('Failed to send welcome email', err));
        }

        return NextResponse.json(
            { success: true, message: result.message },
            { status: 200 }
        );
    } catch (error) {
        logger.error('Subscription error', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
