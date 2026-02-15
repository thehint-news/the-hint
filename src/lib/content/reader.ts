/**
 * Content Reader Utility (Git-Backed)
 * Reads and validates Markdown articles from Git via GitService.
 */

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

/** Valid section folder names */
const VALID_SECTIONS: Section[] = [
    'politics',
    'crime',
    'court',
    'opinion',
    'world-affairs',
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

    // Validate: body cannot be empty
    if (!body || body.trim().length === 0) {
        throw new ContentValidationError(
            'Article body cannot be empty',
            relPath,
            'body'
        );
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
    const resolvedImage = getArticleThumbnail(frontmatter.image, body);

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
        body: body,
    };
}

/**
 * Read all articles from a specific section in Git
 */
async function readSectionArticles(section: Section): Promise<Article[]> {
    const sectionPath = `src/content/${section}`;

    // Read directory from Git
    const files = await gitService.listFiles(sectionPath, '.md');

    const articles: Article[] = [];

    for (const filename of files) {
        const filePath = `${sectionPath}/${filename}`;

        try {
            const article = await readArticleFile(filePath, section);
            articles.push(article);
        } catch (error) {
            console.warn(`Skipping invalid article ${filename}: ${(error as Error).message}`);
        }
    }

    return articles;
}

/**
 * Get all articles from all sections
 */
export async function getAllArticles(): Promise<Article[]> {
    const results = await Promise.all(
        VALID_SECTIONS.map(section => readSectionArticles(section))
    );

    const allArticles = results.flat();

    // Sort by publishedAt descending (newest first)
    allArticles.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
    });

    return allArticles;
}

/**
 * Get a single article by section and slug
 */
export async function getArticleBySlug(section: string, slug: string): Promise<Article | null> {
    if (!isValidSection(section)) {
        throw new ContentValidationError(
            `Invalid section: "${section}". Valid sections are: ${VALID_SECTIONS.join(', ')}`,
            `${section}/${slug}.md`,
            'section'
        );
    }

    const filePath = `src/content/${section}/${slug}.md`;

    try {
        if (!await gitService.fileExists(filePath)) {
            return null;
        }
        return await readArticleFile(filePath, section);
    } catch (err) {
        console.error(`[READER] Failed to read article file at ${filePath} in section ${section}:`, err);
        throw err;
    }
}

/**
 * Get all articles from a specific section
 */
export async function getArticlesBySection(section: string): Promise<Article[]> {
    if (!isValidSection(section)) {
        throw new ContentValidationError(
            `Invalid section: "${section}". Valid sections are: ${VALID_SECTIONS.join(', ')}`,
            section,
            'section'
        );
    }

    const articles = await readSectionArticles(section);

    articles.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
    });

    return articles;
}

/**
 * Get all lead (formerly featured) articles
 */
export async function getLeadArticles(): Promise<Article[]> {
    const all = await getAllArticles();
    return all.filter(article => article.placement === 'lead');
}

/**
 * Get articles by tag
 */
export async function getArticlesByTag(tag: string): Promise<Article[]> {
    const all = await getAllArticles();
    return all.filter(article =>
        article.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
    const allArticles = await getAllArticles();
    const tagSet = new Set<string>();

    for (const article of allArticles) {
        for (const tag of article.tags) {
            tagSet.add(tag.toLowerCase());
        }
    }

    return Array.from(tagSet).sort();
}

/**
 * Get list of all valid sections
 */
export function getValidSections(): Section[] {
    return [...VALID_SECTIONS];
}
