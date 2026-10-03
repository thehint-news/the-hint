import fs from 'fs';
import path from 'path';


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
        const imgMatch = raw.match(/^image:\s*"?([^"\r\n]+)"?/m);
        const socialMatch = raw.match(/^socialImage:\s*"?([^"\r\n]+)"?/m);
        const widthMatch = raw.match(/^imageWidth:\s*([0-9]+)/m);
        const heightMatch = raw.match(/^imageHeight:\s*([0-9]+)/m);

        const imgUrl = imgMatch ? imgMatch[1].trim() : null;
        const socialUrl = socialMatch ? socialMatch[1].trim() : null;

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

        const width = widthMatch ? parseInt(widthMatch[1], 10) : null;
        const height = heightMatch ? parseInt(heightMatch[1], 10) : null;

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
