import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function generateBrandedFallbacks() {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo.png');
    if (!fs.existsSync(logoPath)) {
        throw new Error('Logo not found at ' + logoPath);
    }

    console.log('Generating branded editorial fallback variants...');

    // Load and resize logo to fit comfortably on both cards
    const logoMeta = await sharp(logoPath).metadata();
    console.log('Source Logo:', logoMeta.width, 'x', logoMeta.height);

    // 1. Generate 1200x900 4:3 Editorial Thumbnail
    const logoForThumb = await sharp(logoPath)
        .resize(500, null, { fit: 'inside' })
        .toBuffer();

    const thumbFallback = await sharp({
        create: {
            width: 1200,
            height: 900,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a slate-900
        }
    })
    .composite([
        {
            input: logoForThumb,
            gravity: 'centre'
        }
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

    // 2. Generate 1200x630 1.91:1 Social OG Card
    const logoForSocial = await sharp(logoPath)
        .resize(450, null, { fit: 'inside' })
        .toBuffer();

    const socialFallback = await sharp({
        create: {
            width: 1200,
            height: 630,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 }
        }
    })
    .composite([
        {
            input: logoForSocial,
            gravity: 'centre'
        }
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

    console.log(`Thumbnail Fallback: 1200x900 (${(thumbFallback.length / 1024).toFixed(1)} KB)`);
    console.log(`Social Fallback:    1200x630 (${(socialFallback.length / 1024).toFixed(1)} KB)`);

    // Upload to Supabase Storage
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'article-images';
    const client = createClient(url, key);

    const thumbKey = 'articles/brand/default-thumb-4x3.jpg';
    const socialKey = 'articles/brand/default-og-1200x630.jpg';

    const { error: err1 } = await client.storage.from(bucket).upload(thumbKey, thumbFallback, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true
    });
    if (err1) throw new Error('Thumb upload failed: ' + err1.message);

    const { error: err2 } = await client.storage.from(bucket).upload(socialKey, socialFallback, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true
    });
    if (err2) throw new Error('Social upload failed: ' + err2.message);

    const thumbUrl = client.storage.from(bucket).getPublicUrl(thumbKey).data.publicUrl;
    const socialUrl = client.storage.from(bucket).getPublicUrl(socialKey).data.publicUrl;

    console.log('SUCCESS!');
    console.log('Thumb URL:  ', thumbUrl);
    console.log('Social URL: ', socialUrl);

    return { thumbUrl, socialUrl };
}

generateBrandedFallbacks().catch(console.error);
