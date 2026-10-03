import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'src', 'content');
const categories = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

async function inspectUnresolved() {
    const unresolved: Array<{
        file: string;
        section: string;
        slug: string;
        title: string;
        status: string;
        image: string;
        socialImage: string | null;
    }> = [];

    for (const cat of categories) {
        const catDir = path.join(contentDir, cat);
        if (!fs.existsSync(catDir)) continue;
        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
        for (const f of files) {
            const filePath = path.join(catDir, f);
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(raw);
            if (!parsed.data.socialImage) {
                unresolved.push({
                    file: path.join(cat, f),
                    section: cat,
                    slug: f.replace('.md', ''),
                    title: parsed.data.title,
                    status: parsed.data.status,
                    image: parsed.data.image,
                    socialImage: parsed.data.socialImage || null,
                });
            }
        }
    }

    console.log(`Found exactly ${unresolved.length} articles missing socialImage:\n`);

    for (const item of unresolved) {
        console.log(`ARTICLE: ${item.file}`);
        console.log(`  Title:                  ${item.title}`);
        console.log(`  Section:                ${item.section}`);
        console.log(`  Slug:                   ${item.slug}`);
        console.log(`  Status in frontmatter:  ${item.status}`);
        console.log(`  Source image URL:       ${item.image}`);
        console.log(`  socialImage exists:     ${item.socialImage ? 'YES' : 'NO'}`);

        try {
            const res = await fetch(item.image);
            console.log(`  HTTP status:            ${res.status} ${res.statusText}`);
            console.log(`  Primary image renders:  ${res.ok ? 'YES' : 'NO'}`);
        } catch (e: unknown) {
            console.log(`  HTTP error:             ${e instanceof Error ? e.message : String(e)}`);
            console.log(`  Primary image renders:  NO`);
        }
        console.log('--------------------------------------------------');
    }
}

inspectUnresolved().catch(console.error);
