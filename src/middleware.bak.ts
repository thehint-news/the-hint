
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from './lib/auth/session';

// Paths that require authentication
const PROTECTED_PATHS = ['/publish', '/api/publish'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is protected
    const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

    if (isProtected) {
        const cookie = request.cookies.get(COOKIE_NAME);
        const sessionToken = cookie?.value;

        if (!sessionToken) {
            // If API request, return 401. If Page request, redirect to login
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/newsroom', request.url));
        }

        const email = await verifySessionToken(sessionToken);

        if (!email) {
            // Invalid token
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/newsroom', request.url));
        }

        // Optional: Check if email matches current env var (in case it changed)
        // Note: Session verification usually just checks valid signature and expiry, 
        // but stricter check is good.
        // However, we don't have access to process.env in middleware easily in edge runtime unless defined.
        // We'll rely on the signed JWT being valid.
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/publish/:path*',
        '/api/publish/:path*',
    ],
};
