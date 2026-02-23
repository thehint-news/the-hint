
import { SignJWT } from 'jose';
import fs from 'fs';

const SECRET = new TextEncoder().encode('7b4f34661e91aeadcfa0584e682bcdd190fc99fd');
const ALG = 'HS256';
const EMAIL = 'thehint36@gmail.com';

async function createMagicToken(email) {
    return new SignJWT({ email, jti: 'test-uuid' })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(SECRET);
}

createMagicToken(EMAIL).then(token => {
    const url = `http://localhost:3002/api/auth/verify?token=${token}`;
    fs.writeFileSync('token.txt', url);
    console.log('Token written to token.txt');
});
