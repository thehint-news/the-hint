
import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionQueue } from '@/lib/subscription/processor';

/**
 * Internal API to trigger email processing.
 * Can be called via Cron or manually.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    // SCENARIO 1: Localhost / Development
    // If we are in dev mode and no secret is set in .env.local, allow access for testing.
    // If a secret IS set locally, we still enforce it to test the production flow.
    const isDevBypass = isDev && !cronSecret;

    // SCENARIO 2 & 3: Production / Deployed
    // Strictly enforce the secret.
    if (!isDevBypass && (!cronSecret || secret !== cronSecret)) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const result = await processSubscriptionQueue();

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors,
            remaining: result.remaining,
            message: `Processed ${result.processed} emails. Errors: ${result.errors}. Remaining: ${result.remaining}`
        });
    } catch (error) {
        console.error('Email processing failed:', error);
        return NextResponse.json(
            { success: false, error: 'Internal processing error' },
            { status: 500 }
        );
    }
}
