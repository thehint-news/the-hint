import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'src', 'content');
const categories = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];
let fixed = 0;

for (const cat of categories) {
    const catDir = path.join(contentDir, cat);
    if (!fs.existsSync(catDir)) continue;
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
        const filePath = path.join(catDir, f);
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        if (parsed.data.imageHeight === 630) {
            parsed.data.imageHeight = 900;
            fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf8');
            fixed++;
        }
    }
}
console.log('Corrected imageHeight to 900 in', fixed, 'files');
