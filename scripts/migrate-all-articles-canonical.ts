import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';
dotenv.config();

import { ensureThumbnailImageForUrl, ensureSocialImageForUrl } from '../src/lib/media/supabase-storage';

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content');
const CATEGORIES = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

const BRAND_THUMB_URL = 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/brand/default-thumb-4x3.jpg';
const BRAND_SOCIAL_URL = 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/brand/default-og-1200x630.jpg';

const DEAD_IMAGE_SLUGS = [
    '30-ವರ್ಷದಿಂದ-ಕೊರಗ-ಸಮುದಾಯದ-ವ್ಯಕ್ತಿಯನ್ನು',
    'ಇಸ್ಪೀಟು-ಜುಗಾರಿ-ಆಡುತ್ತಿದ್ದ-10-ಮಂದಿ',
    'ಲೋಕಾ-ಬಲೆಗೆ-ಬಿದ್ದ-ಕೋಟಿ-ಒಡೆಯ',
    'ವೃದ್ದೆಯ-ಬರ್ಬರ-ಹತ್ಯೆ',
    'ಉಡುಪಿ-ಜಿಲ್ಲಾ-ನ್ಯಾಯಾಲಯದ-ಆದೇಶಕ್ಕೆ-ಹೈಕೋರ್ಟ್',
    'ಉಡುಪಿ-ನಗರಠಾಣಾ-ಪಿಎಸ್ಐ-ಭರತೇಶ್-ಮಿಂಚಿನ',
    '೧೬ನೇ-ಕನ್ನಡ-ಸಾಹಿತ್ಯ-ಸಮ್ಮೇಳನದ-ಸ್ವಾಗತ'
];

async function migrateAll() {
    console.log('Starting COMPLETE Canonical Media Normalization across ALL 181 articles...');

    let scanned = 0;
    let thumbGenerated = 0;
    let fallbackAssigned = 0;
    let alreadyCanonical = 0;
    let failed = 0;

    for (const cat of CATEGORIES) {
        const catDir = path.join(ARTICLES_DIR, cat);
        if (!fs.existsSync(catDir)) continue;

        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            scanned++;
            const filePath = path.join(catDir, file);
            const slug = file.replace('.md', '');
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(raw);

            // 1. Handle the 7 dead-image articles explicitly
            if (DEAD_IMAGE_SLUGS.includes(slug)) {
                console.log(`[ASSIGN FALLBACK ${fallbackAssigned + 1}] ${cat}/${slug}`);
                parsed.data.image = BRAND_THUMB_URL;
                parsed.data.socialImage = BRAND_SOCIAL_URL;
                parsed.data.imageWidth = 1200;
                parsed.data.imageHeight = 900;
                parsed.data.imageType = 'image/jpeg';
                fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf8');
                fallbackAssigned++;
                continue;
            }

            // 2. For articles with valid images, generate thumb-4x3 if missing
            const currentImg = parsed.data.image;
            if (typeof currentImg === 'string' && currentImg.includes('-thumb-4x3.jpg')) {
                alreadyCanonical++;
                continue;
            }

            console.log(`[PROCESSING THUMB ${thumbGenerated + 1}] ${cat}/${slug}...`);
            try {
                const thumbUrl = await ensureThumbnailImageForUrl(currentImg);
                if (!thumbUrl) {
                    console.error(`[FAIL] ${cat}/${slug}: Could not generate thumbnail for ${currentImg}`);
                    failed++;
                    continue;
                }

                // Also ensure social image exists
                let socialUrl = parsed.data.socialImage;
                if (!socialUrl || !socialUrl.includes('-og-1200x630.jpg')) {
                    socialUrl = await ensureSocialImageForUrl(currentImg);
                }

                parsed.data.image = thumbUrl;
                parsed.data.socialImage = socialUrl;
                parsed.data.imageWidth = 1200;
                parsed.data.imageHeight = 900;
                parsed.data.imageType = 'image/jpeg';

                fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf8');
                console.log(`[SUCCESS] ${cat}/${slug} -> Thumb: ${thumbUrl}`);
                thumbGenerated++;
            } catch (err) {
                console.error(`[ERROR] ${cat}/${slug}:`, err);
                failed++;
            }
        }
    }

    console.log('\n==================================================');
    console.log(`TOTAL ARTICLES SCANNED:   ${scanned}`);
    console.log(`THUMBNAILS GENERATED:     ${thumbGenerated}`);
    console.log(`DEAD ASSET FALLBACKS:     ${fallbackAssigned}`);
    console.log(`ALREADY CANONICAL:        ${alreadyCanonical}`);
    console.log(`FAILED:                   ${failed}`);
    console.log('==================================================\n');
}

migrateAll().catch(console.error);
