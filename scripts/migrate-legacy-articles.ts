import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ensureSocialImageForUrl } from '../src/lib/media/supabase-storage';

// Load .env
import dotenv from 'dotenv';
dotenv.config();

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content');
const CATEGORIES = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

async function migrateArticles(dryRun = false, limit = 5) {
    console.log(`Starting Legacy Article Migration (dryRun=${dryRun}, limit=${limit})...`);

    let scanned = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const section of CATEGORIES) {
        const sectionPath = path.join(ARTICLES_DIR, section);
        if (!fs.existsSync(sectionPath)) continue;

        const files = fs.readdirSync(sectionPath).filter(f => f.endsWith('.md'));
        for (const file of files) {
            scanned++;
            const filePath = path.join(sectionPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);

            if (parsed.data.socialImage) {
                skipped++;
                continue;
            }

            if (!parsed.data.image) {
                console.log(`[SKIP] ${section}/${file}: No image in frontmatter`);
                skipped++;
                continue;
            }

            if (updated >= limit && limit > 0) {
                break;
            }

            console.log(`[PROCESSING ${updated + 1}] ${section}/${file}... Source: ${parsed.data.image}`);

            if (dryRun) {
                updated++;
                continue;
            }

            try {
                const socialUrl = await ensureSocialImageForUrl(parsed.data.image);
                if (!socialUrl) {
                    console.error(`[FAIL] ${section}/${file}: Failed to generate social image for ${parsed.data.image}`);
                    failed++;
                    continue;
                }

                // Verify the generated socialUrl returns 200 and image/jpeg
                const headRes = await fetch(socialUrl, { method: 'HEAD' });
                if (!headRes.ok) {
                    console.error(`[FAIL] ${section}/${file}: Uploaded social image HTTP status ${headRes.status}`);
                    failed++;
                    continue;
                }

                // Update frontmatter
                parsed.data.socialImage = socialUrl;
                parsed.data.imageWidth = 1200;
                parsed.data.imageHeight = 630;
                parsed.data.imageType = 'image/jpeg';

                const newContent = matter.stringify(parsed.content, parsed.data);
                fs.writeFileSync(filePath, newContent, 'utf-8');

                console.log(`[SUCCESS] ${section}/${file} -> ${socialUrl}`);
                updated++;
            } catch (err) {
                console.error(`[ERROR] ${section}/${file}:`, err);
                failed++;
            }
        }
        if (updated >= limit && limit > 0) {
            break;
        }
    }

    console.log('\n==================================================');
    console.log(`SCANNED: ${scanned}`);
    console.log(`UPDATED: ${updated}`);
    console.log(`SKIPPED: ${skipped}`);
    console.log(`FAILED:  ${failed}`);
    console.log('==================================================\n');
}

const args = process.argv.slice(2);
const isDry = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0; // 0 means all

migrateArticles(isDry, limit).catch(err => {
    console.error('Fatal error in migration:', err);
    process.exit(1);
});
