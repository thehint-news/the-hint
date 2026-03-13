/**
 * Content Reader Utility (Git-Backed)
 * Reads and validates Markdown articles from Git via GitService.
 *
 * All public read functions are backed by a server-side in-memory cache
 * (see src/lib/cache/article-cache.ts). The cache has a 60-second TTL
 * and is immediately invalidated after any mutation (publish/edit/delete).
 */

import { cache } from 'react';
import {
    Article,
    Section,
    ContentValidationError,
} from './types';
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



import { getArticleIndex } from "../contentLoader";
import { getArticleContent } from "../getArticleContent";

/**
 * Get all articles from all sections.
 */
export const getAllArticles = cache(async function getAllArticles(): Promise<Article[]> {
    const { data: cached, isStale } = getCachedArticlesList();
    if (cached && !isStale) {
        return cached;
    }

    try {
        const index = await getArticleIndex();
        
        // Map minimalistic index metadata to the Article interface expected by components
        const allArticles: Article[] = index.map(meta => ({
            id: meta.slug,
            section: meta.category as Section,
            title: meta.title,
            subtitle: meta.subtitle || '',
            contentType: meta.contentType || 'news',
            publishedAt: meta.date,
            updatedAt: meta.updatedAt || null,
            placement: ['lead', 'top', 'standard'].includes(meta.placement || '') ? (meta.placement as Extract<Article['placement'], string>) : 'standard',
            tags: meta.tags || [],
            sources: [],
            image: meta.image || undefined,
            isLead: meta.isLead || false,
        }));

        allArticles.sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return dateB - dateA;
        });

        // We don't cache individual full articles here because we lack the body.
        // It's okay, getArticleBySlug will use getArticleContent.
        
        setCachedArticlesList(allArticles);
        return allArticles;
    } catch (error) {
        if (cached) {
            console.warn('[getAllArticles] Raw CDN fetch failed, serving stale list cache');
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
        const fullArticleContent = await getArticleContent(slug);
        
        if (!fullArticleContent) {
           return null;
        }

        const article: Article = fullArticleContent as unknown as Article; // Mapped properly in getArticleContent

        setCachedArticleBySlug(slug, article);
        return article;
    } catch {
        if (cached) {
            console.warn(`[getArticleBySlug] Fetch failed for ${slug}, serving stale cache`);
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
