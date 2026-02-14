import { NextRequest, NextResponse } from 'next/server';
import { unsubscribe } from '@/lib/subscription';

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

        const result = await unsubscribe(email);

        return NextResponse.json({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
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

    // Redirect to unsubscribe confirmation page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';
    return NextResponse.redirect(`${baseUrl}/unsubscribe?status=${result.success ? 'success' : 'error'}&message=${encodeURIComponent(result.message)}`);
}
