import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const failed = [
    'src/content/crime/30-ವರ್ಷದಿಂದ-ಕೊರಗ-ಸಮುದಾಯದ-ವ್ಯಕ್ತಿಯನ್ನು.md',
    'src/content/crime/ಇಸ್ಪೀಟು-ಜುಗಾರಿ-ಆಡುತ್ತಿದ್ದ-10-ಮಂದಿ.md',
    'src/content/crime/ಲೋಕಾ-ಬಲೆಗೆ-ಬಿದ್ದ-ಕೋಟಿ-ಒಡೆಯ.md',
    'src/content/crime/ವೃದ್ದೆಯ-ಬರ್ಬರ-ಹತ್ಯೆ.md',
    'src/content/court/ಉಡುಪಿ-ಜಿಲ್ಲಾ-ನ್ಯಾಯಾಲಯದ-ಆದೇಶಕ್ಕೆ-ಹೈಕೋರ್ಟ್.md',
    'src/content/local/ಉಡುಪಿ-ನಗರಠಾಣಾ-ಪಿಎಸ್ಐ-ಭರತೇಶ್-ಮಿಂಚಿನ.md',
    'src/content/local/೧೬ನೇ-ಕನ್ನಡ-ಸಾಹಿತ್ಯ-ಸಮ್ಮೇಳನದ-ಸ್ವಾಗತ.md'
];

for (const f of failed) {
    const parsed = matter(fs.readFileSync(path.join(process.cwd(), f), 'utf8'));
    console.log('File:', f);
    console.log('  Image:', parsed.data.image);
    const bodyImages = (parsed.data.bodyBlocks || [])
        .filter((b: { type?: string }) => b.type === 'image')
        .map((b: { src?: string }) => b.src);
    console.log('  BodyBlocks images:', bodyImages);
}
