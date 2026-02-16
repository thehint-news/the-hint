
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
const ALG = 'HS256';
export const COOKIE_NAME = 'the_hint_session';

export async function createSession(email: string) {
    const token = await new SignJWT({ email })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(SECRET);

    const cookieStore = await cookies();

    // Only set secure=true if we are in production AND deployed (e.g. Vercel)
    // This allows testing production builds locally over HTTP (npm start)
    const isProductionDeployed = process.env.NODE_ENV === 'production' && !!process.env.VERCEL;

    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProductionDeployed,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours in seconds
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (!payload.email || typeof payload.email !== 'string') {
            return null;
        }
        return { email: payload.email };
    } catch {
        return null; // Invalid token
    }
}

// Helper for middleware which receives the token string directly
export async function verifySessionToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (!payload.email || typeof payload.email !== 'string') {
            return null;
        }
        return payload.email;
    } catch {
        return null;
    }
}
