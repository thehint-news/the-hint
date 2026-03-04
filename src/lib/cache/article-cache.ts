import type { Article } from '../content/types';

interface ListCacheEntry {
    data: Article[];
    timestamp: number;
}

interface SlugCacheEntry {
    data: Article;
    timestamp: number;
}

const CACHE_TTL_MS = 60_000;

declare global {
    var __articlesListCache: ListCacheEntry | undefined;
    var __articleBySlugCache: Map<string, SlugCacheEntry> | undefined;
}

if (!globalThis.__articleBySlugCache) {
    globalThis.__articleBySlugCache = new Map();
}

/**
 * Get cached articles list. Returns { data, isStale }
 */
export function getCachedArticlesList(): { data: Article[] | null, isStale: boolean } {
    const entry = globalThis.__articlesListCache;
    if (!entry) {
        return { data: null, isStale: false };
    }
    const age = Date.now() - entry.timestamp;
    return { data: entry.data, isStale: age >= CACHE_TTL_MS };
}

export function setCachedArticlesList(articles: Article[]): void {
    globalThis.__articlesListCache = {
        data: articles,
        timestamp: Date.now(),
    };
}

/**
 * Get cached article by slug. Returns { data, isStale }
 */
export function getCachedArticleBySlug(slug: string): { data: Article | null, isStale: boolean } {
    const entry = globalThis.__articleBySlugCache!.get(slug);
    if (!entry) {
        return { data: null, isStale: false };
    }
    const age = Date.now() - entry.timestamp;
    return { data: entry.data, isStale: age >= CACHE_TTL_MS };
}

export function setCachedArticleBySlug(slug: string, article: Article): void {
    globalThis.__articleBySlugCache!.set(slug, {
        data: article,
        timestamp: Date.now(),
    });
}

/**
 * Keep the old function signature for legacy usages if any, but it acts like getCachedArticlesList without stale info
 */
export function getCachedArticles(): Article[] | null {
    const { data, isStale } = getCachedArticlesList();
    if (isStale) return null; // strictly require fresh
    return data;
}

export function setCachedArticles(articles: Article[]): void {
    setCachedArticlesList(articles);
}

export function clearArticleCache(): void {
    globalThis.__articlesListCache = undefined;
    globalThis.__articleBySlugCache!.clear();
    console.log('[Cache] INVALIDATED both caches');
}
