
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
const ALG = 'HS256';
export const COOKIE_NAME = 'the_hint_session';
const TOKEN_EXPIRY = '5m';

export async function createSession(email: string, createdAt?: number) {
    // If createdAt is provided (from magic link iat), use it to set strict session start and end
    // session = 5 minutes from email sent time
    const issuedAt = createdAt;
    const expirationTime = createdAt ? (createdAt + 5 * 60) : TOKEN_EXPIRY;

    const token = await new SignJWT({ email })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt(issuedAt)
        .setExpirationTime(expirationTime)
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
        maxAge: 5 * 60, // 5 minutes in seconds
    });
}


export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export interface Session {
    email: string;
    iat?: number;
    exp?: number;
}

export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (!payload.email || typeof payload.email !== 'string') {
            return null;
        }
        return {
            email: payload.email,
            iat: payload.iat,
            exp: payload.exp
        };
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

// Helper for API routes to enforce strict session validation
export async function verifyAuth() {
    const session = await getSession();
    if (!session || !session.email) {
        throw new Error('Unauthorized');
    }
    return session;
}

export async function refreshSession() {
    const session = await getSession();
    if (!session || !session.email) {
        throw new Error('No active session to refresh');
    }
    // Create new session (rotates token)
    await createSession(session.email);
}
