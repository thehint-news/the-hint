
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getSession();

        // If no session or invalid token (already expired according to jwtVerify)
        if (!session || !session.exp) {
            return NextResponse.json({
                authenticated: false,
                message: 'Session expired or invalid'
            }, { status: 401 });
        }

        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = session.exp - now;

        return NextResponse.json({
            authenticated: true,
            expiresAt: session.exp * 1000,
            remainingMs: remainingSeconds * 1000
        });

    } catch (error) {
        console.error('Session check failed', error);
        return NextResponse.json({
            authenticated: false,
            message: 'Internal error checking session'
        }, { status: 500 });
    }
}
