import { NextRequest, NextResponse } from 'next/server';
import { unsubscribe } from '@/lib/subscription';
import { logger } from '@/lib/feedback/console-guard';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        if (!process.env.GIT_TOKEN) {
            logger.error('Missing GIT_TOKEN environment variable. Unsubscribe cannot be processed.');
            return NextResponse.json(
                { success: false, error: 'System configuration error' },
                { status: 500 }
            );
        }

        const result = await unsubscribe(email);

        return NextResponse.json({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        logger.error('Unsubscribe error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process unsubscribe request' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json(
            { success: false, error: 'Email parameter is required' },
            { status: 400 }
        );
    }

    const result = await unsubscribe(email);

    // Derive base URL from the actual incoming request, not env vars (which may be localhost)
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    return NextResponse.redirect(`${baseUrl}/unsubscribe?status=${result.success ? 'success' : 'error'}&message=${encodeURIComponent(result.message)}`);
}
