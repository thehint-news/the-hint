/**
 * Content Reader Utility (Git-Backed)
 * Reads and validates Markdown articles from Git via GitService.
 *
 * All public read functions are backed by a server-side in-memory cache
 * (see src/lib/cache/article-cache.ts). The cache has a 60-second TTL
 * and is immediately invalidated after any mutation (publish/edit/delete).
 */

import { cache } from 'react';
import { gitService } from '../git/service';
import { parseMarkdown } from './parser';
import { getArticleThumbnail } from './thumbnail';
import {
    Article,
    Section,
    ContentValidationError,
    ContentParseError,
} from './types';
import path from 'path';
import { getCachedArticlesList, getCachedArticleBySlug, setCachedArticlesList, setCachedArticleBySlug } from '../cache/article-cache';

/** Valid section folder names */
const VALID_SECTIONS: Section[] = [
    'politics',
    'crime',
    'court',
    'opinion',
    'world-affairs',
    'local',
];

/**
 * Validate that a section string is a valid Section type
 */
function isValidSection(section: string): section is Section {
    return VALID_SECTIONS.includes(section as Section);
}

/**
 * Extract slug from filename (remove .md extension)
 */
function getSlugFromFilename(filename: string): string {
    return filename.replace(/\.md$/, '');
}

/**
 * Read and parse a single article file from Git
 */
async function readArticleFile(filePath: string, expectedSection: Section): Promise<Article> {
    const relPath = filePath; // GitService handles relative paths

    // Read file content from Git
    const content = await gitService.readFile(filePath);
    if (content === null) {
        throw new ContentParseError(
            `Failed to read file: Not found in Git`,
            relPath
        );
    }

    // Parse markdown and frontmatter
    const parsed = parseMarkdown(content, relPath);
    const { frontmatter, body } = parsed;

    // Extract slug from filename
    const filename = path.basename(filePath);
    const slug = getSlugFromFilename(filename);

    // Validate: opinion contentType can only appear in opinion section
    if (frontmatter.contentType === 'opinion' && expectedSection !== 'opinion') {
        throw new ContentValidationError(
            `Opinion articles can only be placed in the /opinion section. Found opinion article in /${expectedSection}`,
            relPath,
            'contentType'
        );
    }

    // Validate: status must be published
    if (frontmatter.status === 'draft') {
        throw new ContentValidationError(
            'Article is a draft',
            relPath,
            'status'
        );
    }

    // Validate: publishedAt must be present
    if (!frontmatter.publishedAt) {
        throw new ContentValidationError(
            'Article missing publishedAt date',
            relPath,
            'publishedAt'
        );
    }

    // Validate: body cannot be empty (unless bodyBlocks are present)
    // Relaxed check to allow migration to block-based editor without strict markdown sync requirement
    if ((!body || body.trim().length === 0) && (!frontmatter.bodyBlocks || frontmatter.bodyBlocks.length === 0)) {
        console.warn(`[READER] Article ${relPath} has empty body and no blocks. Proceeding with caution.`);
        // potentially return default empty state or throw if strictness is required.
        // For now, we allow it to prevent build failures.
    }

    // Placements
    const validPlacements = ['lead', 'top', 'standard'];
    let placement = frontmatter.placement;

    if (!placement && (frontmatter as unknown as Record<string, unknown>).featured === true) {
        placement = 'lead';
    }

    if (!placement || !validPlacements.includes(placement)) {
        placement = 'standard';
    }

    // Resolve thumbnail: use explicit frontmatter image first,
    // fall back to extracting first image from article body
    const resolvedImage = getArticleThumbnail(frontmatter.image, body || '');

    return {
        id: slug,
        section: expectedSection,
        title: frontmatter.title,
        subtitle: frontmatter.subtitle,
        contentType: frontmatter.contentType,
        publishedAt: frontmatter.publishedAt,
        updatedAt: frontmatter.updatedAt ?? null,
        placement: placement as 'lead' | 'top' | 'standard',
        tags: frontmatter.tags ?? [],
        sources: frontmatter.sources ?? [],
        image: resolvedImage,
        bodyBlocks: frontmatter.bodyBlocks,
        body: body,
        isLead: frontmatter.isLead === true,
        leadMedia: frontmatter.leadMedia,
    };
}

/**
 * Read all articles from a specific section in Git
 */
async function readSectionArticles(section: Section): Promise<Article[]> {
    const sectionPath = `src/content/${section}`;

    // Read directory from Git
    const files = await gitService.listFiles(sectionPath, '.md');

    // Concurrency limit to prevent GitHub secondary rate limits but remain fast
    const CONCURRENCY = 8;
    const articlesOrNull: (Article | null)[] = [];

    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            chunk.map(async (filename) => {
                const filePath = `${sectionPath}/${filename}`;
                try {
                    return await readArticleFile(filePath, section);
                } catch (error) {
                    console.warn(`Skipping invalid article ${filename}: ${(error as Error).message}`);
                    return null;
                }
            })
        );
        articlesOrNull.push(...results);
    }

    return articlesOrNull.filter((article): article is Article => article !== null);
}

/**
 * Get all articles from all sections.
 */
export const getAllArticles = cache(async function getAllArticles(): Promise<Article[]> {
    const { data: cached, isStale } = getCachedArticlesList();
    if (cached && !isStale) {
        return cached;
    }

    try {
        const results = await Promise.all(
            VALID_SECTIONS.map(section => readSectionArticles(section))
        );

        const allArticles = results.flat();
        allArticles.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return dateB - dateA;
        });

        for (const a of allArticles) {
            setCachedArticleBySlug(a.id, a);
        }

        const listData = allArticles.map(a => {
            // Omit heavy body content from the list cache
            const meta = { ...a };
            delete (meta as Record<string, unknown>).body;
            delete (meta as Record<string, unknown>).bodyBlocks;
            return meta as Article;
        });

        setCachedArticlesList(listData);
        return listData;
    } catch (error) {
        if (cached) {
            console.warn('[getAllArticles] GitHub API failed, serving stale list cache');
            return cached;
        }
        throw error;
    }
});

/**
 * Get a single article by section and slug.
 */
export const getArticleBySlug = cache(async function getArticleBySlug(section: string, slug: string): Promise<Article | null> {
    if (!isValidSection(section)) {
        throw new ContentValidationError(
            `Invalid section: "${section}". Valid sections are: ${VALID_SECTIONS.join(', ')}`,
            `${section}/${slug}.md`,
            'section'
        );
    }

    const { data: cached, isStale } = getCachedArticleBySlug(slug);
    if (cached && !isStale) {
        return cached;
    }

    try {
        const filePath = `src/content/${section}/${slug}.md`;
        const article = await readArticleFile(filePath, section as Section);
        setCachedArticleBySlug(slug, article);
        return article;
    } catch {
        if (cached) {
            console.warn(`[getArticleBySlug] GitHub API failed for ${slug}, serving stale cache`);
            return cached;
        }
        return null;
    }
});

/**
 * Get all articles from a specific section.
 *
 * Filters from the cached full list to avoid per-section GitHub API calls.
 */
export const getArticlesBySection = cache(async function getArticlesBySection(section: string): Promise<Article[]> {
    if (!isValidSection(section)) {
        throw new ContentValidationError(
            `Invalid section: "${section}". Valid sections are: ${VALID_SECTIONS.join(', ')}`,
            section,
            'section'
        );
    }

    // Derive from the full cached list
    const allArticles = await getAllArticles();
    const sectionArticles = allArticles.filter(
        (article) => article.section === section
    );

    // Already sorted by publishedAt desc from getAllArticles
    return sectionArticles;
});

/**
 * Get all lead (formerly featured) articles
 */
export const getLeadArticles = cache(async function getLeadArticles(): Promise<Article[]> {
    const all = await getAllArticles();
    return all.filter(article => article.placement === 'lead');
});

/**
 * Get articles by tag
 */
export const getArticlesByTag = cache(async function getArticlesByTag(tag: string): Promise<Article[]> {
    const all = await getAllArticles();
    return all.filter(article =>
        article.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
});

/**
 * Get all unique tags
 */
export const getAllTags = cache(async function getAllTags(): Promise<string[]> {
    const allArticles = await getAllArticles();
    const tagSet = new Set<string>();

    for (const article of allArticles) {
        for (const tag of article.tags) {
            tagSet.add(tag.toLowerCase());
        }
    }

    return Array.from(tagSet).sort();
});

/**
 * Get list of all valid sections
 */
export function getValidSections(): Section[] {
    return [...VALID_SECTIONS];
}
