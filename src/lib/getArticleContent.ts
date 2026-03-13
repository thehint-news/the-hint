import { cache } from "react";
import fs from "fs";
import path from "path";
import { getArticleIndex } from "./contentLoader";
import { parseMarkdown } from "./content/parser"; // assuming we can still use this existing parser
import { getArticleThumbnail } from "./content/thumbnail"; // assuming we still use this

export const getArticleContent = cache(async (slug: string) => {
    const index = await getArticleIndex();
    const articleMeta = index.find(a => a.slug === slug);

    if (!articleMeta) {
        return null;
    }

    const { file, category } = articleMeta;
    
    // Construct the filesystem path instead of URL
    const filePath = path.join(process.cwd(), "src", "content", category, `${slug}.md`);

    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Article markdown not found for slug '${slug}' at ${filePath}`);
        }

        const rawMarkdown = await fs.promises.readFile(filePath, "utf-8");
        const parsed = parseMarkdown(rawMarkdown, file);
        const { frontmatter, body } = parsed;

        // Let's try returning a standard object matching their old `Article` type
        const fr = frontmatter as unknown as Record<string, unknown>;
        const placement = (fr.placement as string | undefined) || ((fr.featured as boolean | undefined) ? 'lead' : 'standard');
        
        return {
            id: slug,
            section: category,
            title: articleMeta.title || frontmatter.title,
            subtitle: frontmatter.subtitle,
            contentType: frontmatter.contentType,
            publishedAt: frontmatter.publishedAt || articleMeta.date,
            updatedAt: frontmatter.updatedAt ?? null,
            placement: ['lead', 'top', 'standard'].includes(placement) ? placement : 'standard',
            tags: frontmatter.tags ?? [],
            sources: frontmatter.sources ?? [],
            image: getArticleThumbnail(frontmatter.image, body || ''),
            bodyBlocks: frontmatter.bodyBlocks,
            body: body,
            isLead: frontmatter.isLead === true || placement === 'lead',
            leadMedia: frontmatter.leadMedia,
        };
    } catch (error) {
        console.error("Failed to fetch article content:", error);
        throw error;
    }
});
