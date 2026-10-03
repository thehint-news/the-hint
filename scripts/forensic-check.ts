import fs from 'fs';
import path from 'path';
import sharp from 'sharp';


const articlesToCheck = [
    { section: 'court', slug: '71-year-old-grandfather-sentenced' },
    { section: 'court', slug: 'ಆ್ಯಸಿಡ್-ಎರಚಿ-ಕೊಲೆಯತ್ನ-ನಡೆಸಿದ-ಆರೋಪಿ' },
    { section: 'court', slug: 'ಉಡುಪಿ-ಜಿಲ್ಲಾ-ಅಧಿವ್ಯಕ್ತ-ಪರಿಷತ್-ವತಿಯಿಂದ' },
    { section: 'court', slug: 'ಉಡುಪಿ-ಜಿಲ್ಲಾ-ನ್ಯಾಯಾಲಯಕ್ಕೆ-ಬಾಂಬ್-ಬೆದರಿಕೆ' },
    { section: 'court', slug: 'ಉಡುಪಿ-ಜಿಲ್ಲಾ-ನ್ಯಾಯಾಲಯಕ್ಕೆ-ಹುಸಿ-ಬಾಂಬ್' }
];

async function forensic() {
    console.log('=== PART 3: FORENSIC INVESTIGATION OF 5 REAL ARTICLES ===\n');

    for (const a of articlesToCheck) {
        console.log(`--------------------------------------------------------------------------------`);
        console.log(`ARTICLE: ${a.section}/${a.slug}`);

        // 1. Inspect frontmatter markdown
        const mdPath = path.join(process.cwd(), 'src', 'content', a.section, `${a.slug}.md`);
        let frontmatterImage = null;
        let frontmatterWidth = null;
        let frontmatterHeight = null;
        let frontmatterType = null;
        if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf8');
            const matchImg = content.match(/^image:\s*"?([^"\r\n]+)"?/m);
            const matchW = content.match(/^imageWidth:\s*([0-9]+)/m);
            const matchH = content.match(/^imageHeight:\s*([0-9]+)/m);
            const matchT = content.match(/^imageType:\s*"?([^"\r\n]+)"?/m);
            frontmatterImage = matchImg ? matchImg[1] : null;
            frontmatterWidth = matchW ? matchW[1] : null;
            frontmatterHeight = matchH ? matchH[1] : null;
            frontmatterType = matchT ? matchT[1] : null;
        }
        console.log(`[1] Frontmatter:`);
        console.log(`    image: ${frontmatterImage}`);
        console.log(`    imageWidth: ${frontmatterWidth}`);
        console.log(`    imageHeight: ${frontmatterHeight}`);
        console.log(`    imageType: ${frontmatterType}`);

        // 2. Fetch rendered HTML
        const url = `https://www.thehintnews.in/${a.section}/${encodeURIComponent(a.slug)}`;
        console.log(`[2] Live URL: ${url}`);
        let html = '';
        try {
            const res = await fetch(url);
            console.log(`    HTML Status: ${res.status}`);
            html = await res.text();
        } catch (e: unknown) {
            console.log(`    HTML Fetch Failed: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3. Extract OpenGraph tags
        const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || null;
        const ogWidth = html.match(/<meta property="og:image:width" content="([^"]+)"/i)?.[1] || null;
        const ogHeight = html.match(/<meta property="og:image:height" content="([^"]+)"/i)?.[1] || null;
        const ogType = html.match(/<meta property="og:image:type" content="([^"]+)"/i)?.[1] || null;
        const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/i)?.[1] || null;

        console.log(`[3] Rendered OG Tags:`);
        console.log(`    og:image:        ${ogImage}`);
        console.log(`    og:image:width:  ${ogWidth || 'MISSING'}`);
        console.log(`    og:image:height: ${ogHeight || 'MISSING'}`);
        console.log(`    og:image:type:   ${ogType || 'MISSING'}`);
        console.log(`    og:url:          ${ogUrl || 'MISSING'}`);

        // 4. HTTP GET OG image directly
        if (ogImage) {
            console.log(`[4] Direct OG Image Analysis:`);
            try {
                const imgRes = await fetch(ogImage);
                console.log(`    Status:         ${imgRes.status}`);
                console.log(`    Content-Type:   ${imgRes.headers.get('content-type')}`);
                console.log(`    Content-Length: ${imgRes.headers.get('content-length')} bytes`);
                const buf = Buffer.from(await imgRes.arrayBuffer());
                const sizeKb = (buf.length / 1024).toFixed(1);
                console.log(`    Actual Size:    ${buf.length} bytes (${sizeKb} KB)`);

                const meta = await sharp(buf).metadata();
                console.log(`    Sharp Format:   ${meta.format}`);
                console.log(`    Sharp Width:    ${meta.width}px`);
                console.log(`    Sharp Height:   ${meta.height}px`);
                const ratio = meta.width && meta.height ? (meta.width / meta.height).toFixed(2) : 'N/A';
                console.log(`    Aspect Ratio:   ${ratio}:1`);

                console.log(`[5] Crawler Criteria Check:`);
                console.log(`    - HTTPS URL:                ${ogImage.startsWith('https://') ? 'PASS' : 'FAIL'}`);
                console.log(`    - Not /_next/image:         ${!ogImage.includes('/_next/image') ? 'PASS' : 'FAIL'}`);
                console.log(`    - Publicly reachable:       ${imgRes.status === 200 ? 'PASS' : 'FAIL'}`);
                console.log(`    - WhatsApp Size <= 300KB:   ${buf.length <= 300 * 1024 ? 'PASS' : `FAIL (${sizeKb} KB > 300 KB)`}`);
                console.log(`    - Canonical 1.91:1 ratio:   ${ratio === '1.90' || ratio === '1.91' ? 'PASS' : `FAIL (${ratio}:1 instead of 1.91:1)`}`);
                console.log(`    - Dimension metadata tags:  ${ogWidth && ogHeight ? 'PASS' : 'FAIL (Missing tags)'}`);
            } catch (e: unknown) {
                console.log(`    Image Probe Failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
}

forensic().catch(console.error);
