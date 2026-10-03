import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const slugs = [
    '30-ವರ್ಷದಿಂದ-ಕೊರಗ-ಸಮುದಾಯದ-ವ್ಯಕ್ತಿಯನ್ನು',
    'ಇಸ್ಪೀಟು-ಜುಗಾರಿ-ಆಡುತ್ತಿದ್ದ-10-ಮಂದಿ',
    'ಲೋಕಾ-ಬಲೆಗೆ-ಬಿದ್ದ-ಕೋಟಿ-ಒಡೆಯ',
    'ವೃದ್ದೆಯ-ಬರ್ಬರ-ಹತ್ಯೆ',
    'ಉಡುಪಿ-ಜಿಲ್ಲಾ-ನ್ಯಾಯಾಲಯದ-ಆದೇಶಕ್ಕೆ-ಹೈಕೋರ್ಟ್',
    'ಉಡುಪಿ-ನಗರಠಾಣಾ-ಪಿಎಸ್ಐ-ಭರತೇಶ್-ಮಿಂಚಿನ',
    '೧೬ನೇ-ಕನ್ನಡ-ಸಾಹಿತ್ಯ-ಸಮ್ಮೇಳನದ-ಸ್ವಾಗತ'
];

const contentDir = path.join(process.cwd(), 'src', 'content');
const cats = ['crime', 'court', 'local'];

async function check() {
    for (const slug of slugs) {
        for (const cat of cats) {
            const p = path.join(contentDir, cat, slug + '.md');
            if (fs.existsSync(p)) {
                const parsed = matter(fs.readFileSync(p, 'utf8'));
                console.log(`SLUG: ${slug}`);
                console.log(`  image:        ${parsed.data.image}`);
                console.log(`  socialImage:  ${parsed.data.socialImage}`);
                console.log(`  dimensions:   ${parsed.data.imageWidth} x ${parsed.data.imageHeight}`);
                
                const resThumb = await fetch(parsed.data.image);
                const resSocial = await fetch(parsed.data.socialImage);
                console.log(`  Thumb HTTP:   ${resThumb.status} ${resThumb.statusText}`);
                console.log(`  Social HTTP:  ${resSocial.status} ${resSocial.statusText}`);
                console.log('--------------------------------------------------');
            }
        }
    }
}

check().catch(console.error);
