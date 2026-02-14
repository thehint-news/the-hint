import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';

export async function POST(request: NextRequest) {
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
