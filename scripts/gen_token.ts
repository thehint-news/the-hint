
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode('7b4f34661e91aeadcfa0584e682bcdd190fc99fd');
const ALG = 'HS256';
const EMAIL = 'thehint36@gmail.com';

async function createMagicToken(email: string) {
    return new SignJWT({ email, jti: 'test-uuid' })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(SECRET);
}

createMagicToken(EMAIL).then(token => {
    console.log(`http://localhost:3002/api/auth/verify?token=${token}`);
});
