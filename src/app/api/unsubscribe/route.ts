import { NextRequest, NextResponse } from 'next/server';
import { unsubscribe } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';
import { validateSubscriptionEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const timestamp = new Date().toISOString();
    
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        const envValidation = validateSubscriptionEnv();
        if (!envValidation.valid) {
            logger.error(`[UNSUBSCRIBE] Missing environment variables: ${envValidation.missing.join(', ')}`);
            return NextResponse.json(
                { success: false, error: 'System configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        const result = await unsubscribe(email);

        if (result.success) {
            logger.info(`[UNSUBSCRIBE] Success: ${email} at ${timestamp}, storageSuccess: ${result.storageSuccess}`);
        } else {
            logger.error(`[UNSUBSCRIBE] Failed: ${email} at ${timestamp}, error: ${result.message}`);
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        logger.error('[UNSUBSCRIBE] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process unsubscribe request' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const timestamp = new Date().toISOString();

    if (!email) {
        return NextResponse.json(
            { success: false, error: 'Email parameter is required' },
            { status: 400 }
        );
    }

    const result = await unsubscribe(email);

    if (result.success) {
        logger.info(`[UNSUBSCRIBE] GET Success: ${email} at ${timestamp}`);
    } else {
        logger.error(`[UNSUBSCRIBE] GET Failed: ${email} at ${timestamp}, error: ${result.message}`);
    }

    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    return NextResponse.redirect(`${baseUrl}/unsubscribe?status=${result.success ? 'success' : 'error'}&message=${encodeURIComponent(result.message)}`);
}
