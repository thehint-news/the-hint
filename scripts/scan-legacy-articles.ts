import fs from 'fs';
import path from 'path';


import matter from 'gray-matter';

async function scanLegacy() {
    let withImage = 0;
    let withSocialImage = 0;
    let missingSocialImage = 0;
    let invalidImageUrls = 0;
    let wrongDimensions = 0;
    let brokenOgMetadata = 0;

    // Check each markdown file directly in src/content
    const markdownFiles: Array<{ slug: string, category: string, file: string }> = [];
    const contentDir = path.join(process.cwd(), 'src', 'content');
    const categories = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

    for (const cat of categories) {
        const catDir = path.join(contentDir, cat);
        if (!fs.existsSync(catDir)) continue;
        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
        for (const f of files) {
            markdownFiles.push({ slug: f.replace('.md', ''), category: cat, file: path.join(catDir, f) });
        }
    }

    console.log(`Found ${markdownFiles.length} markdown article files on disk.`);

    for (const mf of markdownFiles) {
        const raw = fs.readFileSync(mf.file, 'utf8');
        const parsed = matter(raw);
        const data = parsed.data;

        const imgUrl = typeof data.image === 'string' ? data.image.trim() : null;
        const socialUrl = typeof data.socialImage === 'string' ? data.socialImage.trim() : null;

        if (imgUrl) {
            withImage++;
            if (!imgUrl.startsWith('https://')) {
                invalidImageUrls++;
            }
        }

        if (socialUrl) {
            withSocialImage++;
        } else {
            missingSocialImage++;
        }

        const width = typeof data.imageWidth === 'number' ? data.imageWidth : null;
        const height = typeof data.imageHeight === 'number' ? data.imageHeight : null;

        if (!width || !height) {
            brokenOgMetadata++;
        } else {
            const ratio = width / height;
            // Target OG is 1.91:1 (1200x630, approx 1.905)
            // Target Thumbnail is 4:3 (1200x900, 1.333)
            if (Math.abs(ratio - 1.905) > 0.05) {
                wrongDimensions++;
            }
        }
    }

    console.log('\n==================================================');
    console.log('PART 14: LEGACY ARTICLE SCAN REPORT');
    console.log('==================================================');
    console.log(`TOTAL ARTICLES:               ${markdownFiles.length}`);
    console.log(`ARTICLES WITH image:          ${withImage}`);
    console.log(`ARTICLES WITH socialImage:    ${withSocialImage}`);
    console.log(`ARTICLES MISSING socialImage: ${missingSocialImage}`);
    console.log(`INVALID image URLs:           ${invalidImageUrls}`);
    console.log(`WRONG DIMENSIONS (not 1.91:1):${wrongDimensions}`);
    console.log(`BROKEN OG METADATA (missing): ${brokenOgMetadata}`);
    console.log('==================================================');
}

scanLegacy().catch(console.error);
