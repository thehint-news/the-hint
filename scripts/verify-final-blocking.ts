import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import sharp from 'sharp';

async function main() {
    console.log('==================================================');
    console.log('CHECK 1 & 2: 3 MIGRATED ARTICLES INSPECTION');
    console.log('==================================================');

    const samples = [
        'src/content/politics/90-ದಿನಗಳೊಳಗೆ-ಅಂಗನವಾಡಿ-ಖಾಲಿ-ಹುದ್ದೆ.md',
        'src/content/politics/dksin-knnd-jilley-abhivrddhige-hos.md',
        'src/content/crime/ಒಂದೇ-ಕೇಸ್-ಉಡುಪಿಯಲ್ಲಿ-ಗುಡುಗಿದ-ಪೊಲೀಸ್.md'
    ];

    for (const relPath of samples) {
        const fullPath = path.join(process.cwd(), relPath);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = matter(raw);

        console.log(`\nARTICLE: ${relPath}`);
        console.log('FRONTMATTER:');
        console.log('  image:       ', parsed.data.image);
        console.log('  socialImage: ', parsed.data.socialImage);
        console.log('  imageWidth:  ', parsed.data.imageWidth);
        console.log('  imageHeight: ', parsed.data.imageHeight);
        console.log('  imageType:   ', parsed.data.imageType);

        const imgUrl = parsed.data.image;
        if (imgUrl) {
            console.log('FETCHING `image` URL BYTES:');
            try {
                const res = await fetch(imgUrl);
                console.log('  HTTP Status:    ', res.status);
                const buf = Buffer.from(await res.arrayBuffer());
                console.log('  Bytes:          ', buf.length);
                const meta = await sharp(buf).metadata();
                console.log('  Width:          ', meta.width);
                console.log('  Height:         ', meta.height);
                console.log('  Format:         ', meta.format);
                console.log('  Is 1200x900 4:3?', meta.width === 1200 && meta.height === 900);
            } catch (err) {
                console.log('  Error fetching image:', err);
            }
        }
    }

    console.log('\n==================================================');
    console.log('CHECK 3: THE 7 UNRESOLVED ARTICLES AUDIT');
    console.log('==================================================');

    const failedArticles = [
        {
            file: 'src/content/crime/30-ವರ್ಷಗಳಿಂದ-ತಲೆ-ಮರೆಸಿಕೊಂಡಿದ್ದ-ಆರೋಪಿಯನ್ನು.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/e8ca1ac85f0f1070.jpg'
        },
        {
            file: 'src/content/crime/ಇಸ್ಪೀಟು-ಜುಗಾರಿ-ಆಡುತ್ತಿದ್ದ-10-ಮಂದಿ.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/2b5be3ab8971e141.png'
        },
        {
            file: 'src/content/crime/ಕಾಲೇಜು-ವಿದ್ಯಾರ್ಥಿ-ಆತ್ಮಹತ್ಯೆ-ರೈಲ್ವೆ-ಹಳಿಯಲ್ಲಿ.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/2002bdc5bde08f74.jpg'
        },
        {
            file: 'src/content/crime/ಗುಂಡ್ಯ-ಬೈಪಾಸ್-ಬಳಿ-ಲಾರಿ-ಢಿಕ್ಕಿ.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/ae24d071213dc73c.jpg'
        },
        {
            file: 'src/content/court/ಕಾವೂರಿನ-ಮೈಂದನ-ಕೊಲೆ-ಪ್ರಕರಣ-ಆರೋಪಿಗೆ-ಜೀವಾವಧಿ.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/07/da6f9eecdfd90330.jpg'
        },
        {
            file: 'src/content/local/ಕಟಪಾಡಿ-ಜಾಮಿಯಾ-ಮಸೀದಿಯಲ್ಲಿ-ಸೌಹಾರ್ದ-ಇಫ್ತಾರ್.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/06/4c9a5aa8e964b4ff.jpg'
        },
        {
            file: 'src/content/local/೧೬ನೇ-ಕನ್ನಡ-ಸಾಹಿತ್ಯ-ಸಮ್ಮೇಳನದ-ಸ್ವಾಗತ.md',
            url: 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/b628cd46583cf439.jpg'
        }
    ];

    for (const item of failedArticles) {
        const fullPath = path.join(process.cwd(), item.file);
        const exists = fs.existsSync(fullPath);
        let parsed: matter.GrayMatterFile<string> | null = null;
        if (exists) {
            parsed = matter(fs.readFileSync(fullPath, 'utf8'));
        }

        console.log(`\nARTICLE: ${item.file}`);
        console.log('  File exists on disk:', exists);
        console.log('  Status in frontmatter:', parsed?.data?.status);
        console.log('  Source Image URL:    ', item.url);
        console.log('  Has socialImage:     ', !!parsed?.data?.socialImage);

        try {
            const res = await fetch(item.url);
            console.log('  HTTP Status:         ', res.status);
            console.log('  Primary Image Renders:', res.ok);
        } catch (e: unknown) {
            console.log('  HTTP Fetch Error:    ', e instanceof Error ? e.message : String(e));
            console.log('  Primary Image Renders: false');
        }
    }
}

main().catch(console.error);
