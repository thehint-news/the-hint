
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
const ALG = 'HS256';

export async function createMagicToken(email: string) {
    const expiry = process.env.MAGIC_LINK_EXPIRY_MINUTES
        ? `${process.env.MAGIC_LINK_EXPIRY_MINUTES}m`
        : '3m'; // 3 minutes default

    return new SignJWT({ email, jti: crypto.randomUUID() })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(expiry)
        .sign(SECRET);
}

export async function verifyMagicToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (!payload.email || typeof payload.email !== 'string') {
            return null;
        }
        return {
            email: payload.email,
            jti: payload.jti as string | undefined
        };
    } catch {
        return null;
    }
}
