import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'src/content');
const articlesDir = path.join(process.cwd(), 'articles');

if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir);
}

const sections = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];
const index = [];

for (const section of sections) {
    const sectionPath = path.join(contentDir, section);
    if (!fs.existsSync(sectionPath)) continue;

    const files = fs.readdirSync(sectionPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const filePath = path.join(sectionPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // rudimentary frontmatter parser
        const match = content.match(/^---\n([\s\S]+?)\n---/);
        let frontmatter = {};
        if (match) {
            const yaml = match[1];
            yaml.split('\n').forEach(line => {
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    const key = line.slice(0, colonIdx).trim();
                    let val = line.slice(colonIdx + 1).trim();
                    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                    if (val === 'true') val = true;
                    if (val === 'false') val = false;
                    frontmatter[key] = val;
                }
            });
        }
        
        const slug = file.replace('.md', '');
        index.push({
            slug,
            title: frontmatter.title || slug,
            subtitle: frontmatter.subtitle || '',
            date: frontmatter.publishedAt || new Date().toISOString(),
            updatedAt: frontmatter.updatedAt || null,
            category: section,
            language: "kn",
            file: `${section}/${file}`,
            contentType: frontmatter.contentType || 'news',
            placement: frontmatter.placement || (frontmatter.isLead ? 'lead' : 'standard'),
            isLead: frontmatter.isLead || false,
            image: frontmatter.image || null,
            tags: frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : []
        });
    }
}

fs.writeFileSync(path.join(articlesDir, 'index.json'), JSON.stringify(index, null, 2));
console.log(`Generated articles/index.json with ${index.length} articles.`);
