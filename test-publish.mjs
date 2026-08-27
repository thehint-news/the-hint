import { SignJWT } from 'jose';
import * as dotenv from 'dotenv';
dotenv.config();

const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
const ALG = 'HS256';

async function main() {
    // Generate valid session token
    const token = await new SignJWT({ email: 'test@example.com' })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(SECRET);

    const payload = {
        status: 'published',
        headline: 'Test API Publish',
        subheadline: 'Testing the post-publish fix',
        section: 'politics',
        contentType: 'news',
        body: 'This is a test article.',
        tags: ['test'],
        sources: ['test source'],
        placement: 'standard',
        thumbnail: 'https://example.com/image.jpg'
    };

    console.log('Sending request to /api/publish...');
    
    const response = await fetch('http://localhost:3002/api/publish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `the_hint_session=${token}`
        },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
}

main().catch(console.error);
