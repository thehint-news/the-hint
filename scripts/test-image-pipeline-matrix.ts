/**
 * Comprehensive Test Matrix for Image Processing Pipeline
 * Verifies all 10 aspect ratios and formats per Part 13.
 */

import sharp from 'sharp';
import { processImageVariants } from '../src/lib/media/image-processor';

interface TestCase {
    id: number;
    name: string;
    width: number;
    height: number;
    format: 'jpeg' | 'png' | 'webp';
    mimeType: string;
}

const testCases: TestCase[] = [
    { id: 1, name: '16:9 landscape', width: 1920, height: 1080, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 2, name: '4:3 landscape', width: 1600, height: 1200, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 3, name: '3:2 landscape', width: 1500, height: 1000, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 4, name: 'square 1:1', width: 1000, height: 1000, format: 'png', mimeType: 'image/png' },
    { id: 5, name: 'portrait 3:4', width: 900, height: 1200, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 6, name: 'very wide image', width: 2400, height: 600, format: 'webp', mimeType: 'image/webp' },
    { id: 7, name: 'large high-resolution image', width: 4000, height: 3000, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 8, name: 'JPEG format', width: 1280, height: 720, format: 'jpeg', mimeType: 'image/jpeg' },
    { id: 9, name: 'PNG format', width: 1280, height: 720, format: 'png', mimeType: 'image/png' },
    { id: 10, name: 'WebP format', width: 1280, height: 720, format: 'webp', mimeType: 'image/webp' },
];

async function createTestImage(width: number, height: number, format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
    const svgOverlay = Buffer.from(`
        <svg width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="#1a365d" />
            <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#e53e3e" />
            <text x="50%" y="50%" font-size="48" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">TEST ${width}x${height}</text>
        </svg>
    `);

    let pipeline = sharp(svgOverlay);
    if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 90 });
    } else if (format === 'png') {
        pipeline = pipeline.png();
    } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality: 90 });
    }
    return pipeline.toBuffer();
}

async function runTestMatrix() {
    console.log('=== PART 13: TEST MATRIX EXECUTION ===\n');

    let passedCount = 0;

    for (const tc of testCases) {
        process.stdout.write(`Test ${tc.id}: ${tc.name} (${tc.width}x${tc.height} ${tc.format})... `);
        
        // 1. Generate test buffer
        const inputBuffer = await createTestImage(tc.width, tc.height, tc.format);
        
        // 2. Process variants
        const result = await processImageVariants(inputBuffer, tc.mimeType);

        // 3. Verify original
        if (!result.original || result.original.width !== tc.width || result.original.height !== tc.height) {
            throw new Error(`Original dimensions mismatch: expected ${tc.width}x${tc.height}, got ${result.original.width}x${result.original.height}`);
        }

        // 4. Verify Thumbnail 4:3 (1200x900)
        const thumbMeta = await sharp(result.thumbnail.buffer).metadata();
        if (thumbMeta.width !== 1200 || thumbMeta.height !== 900) {
            throw new Error(`Thumbnail dimensions mismatch: expected 1200x900, got ${thumbMeta.width}x${thumbMeta.height}`);
        }
        if (result.thumbnail.mimeType !== 'image/jpeg') {
            throw new Error(`Thumbnail format mismatch: expected image/jpeg, got ${result.thumbnail.mimeType}`);
        }

        // 5. Verify OG / Social (1200x630, <= 300KB)
        const socialMeta = await sharp(result.social.buffer).metadata();
        if (socialMeta.width !== 1200 || socialMeta.height !== 630) {
            throw new Error(`Social dimensions mismatch: expected 1200x630, got ${socialMeta.width}x${socialMeta.height}`);
        }
        if (result.social.mimeType !== 'image/jpeg') {
            throw new Error(`Social format mismatch: expected image/jpeg, got ${result.social.mimeType}`);
        }
        if (result.social.size > 300 * 1024) {
            throw new Error(`Social size exceeds WhatsApp 300KB limit: ${(result.social.size / 1024).toFixed(1)} KB`);
        }

        const ogKb = (result.social.size / 1024).toFixed(1);
        const thumbKb = (result.thumbnail.size / 1024).toFixed(1);
        console.log(`PASS [Thumb: 1200x900 (${thumbKb} KB) | OG: 1200x630 (${ogKb} KB)]`);
        passedCount++;
    }

    console.log(`\n==================================================`);
    console.log(`TEST MATRIX RESULT: ${passedCount}/${testCases.length} PASSED (100%)`);
    console.log(`==================================================\n`);
}

runTestMatrix().catch(err => {
    console.error('Test matrix failed:', err);
    process.exit(1);
});
