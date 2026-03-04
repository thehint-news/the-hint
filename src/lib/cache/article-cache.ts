/**
 * Server-Side Article Cache Module
 *
 * In-memory cache for GitHub article reads with TTL-based expiration
 * and deterministic invalidation on mutations.
 *
 * ARCHITECTURE:
 * - Uses Node.js global scope to survive module reloads in dev
 * - TTL of 60 seconds for automatic refresh
 * - Immediate invalidation on publish/edit/delete/duplicate
 * - Safe for Vercel serverless (each instance has its own memory, TTL handles staleness)
 * - Never caches mutations, auth state, or per-user data
 *
 * SECURITY:
 * - Does NOT expose GitHub tokens
 * - Does NOT log full article payloads
 * - Only caches public content (Article[])
 */

import type { Article } from '../content/types';

// ---------------------------------------------------------------------------
// Cache Structure
// ---------------------------------------------------------------------------

interface CacheEntry {
    data: Article[];
    timestamp: number;
}

/** TTL in milliseconds — 60 seconds */
const CACHE_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Global Store (survives HMR in dev, per-instance in serverless)
// ---------------------------------------------------------------------------

// Use `globalThis` so the store survives Next.js HMR module reloads in dev.
// In production / Vercel, each serverless instance gets its own store — this is
// acceptable because TTL = 60 s and mutations clear the instance's cache.

declare global {
    var __articleCache: CacheEntry | undefined;
}

function getStore(): CacheEntry | undefined {
    return globalThis.__articleCache;
}

function setStore(entry: CacheEntry): void {
    globalThis.__articleCache = entry;
}

function deleteStore(): void {
    globalThis.__articleCache = undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve cached articles if they exist and the TTL has not expired.
 *
 * @returns The cached Article[] or `null` if the cache is cold / expired.
 */
export function getCachedArticles(): Article[] | null {
    const entry = getStore();

    if (!entry) {
        console.log('[Cache] MISS — no cached data');
        return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age >= CACHE_TTL_MS) {
        console.log(`[Cache] MISS — expired (age: ${Math.round(age / 1000)}s, TTL: ${CACHE_TTL_MS / 1000}s)`);
        deleteStore();
        return null;
    }

    console.log(`[Cache] HIT — age: ${Math.round(age / 1000)}s`);
    return entry.data;
}

/**
 * Store a fresh set of articles in the cache.
 *
 * Call this immediately after a successful GitHub API fetch.
 *
 * @param articles The full Article[] fetched from GitHub.
 */
export function setCachedArticles(articles: Article[]): void {
    setStore({
        data: articles,
        timestamp: Date.now(),
    });
    console.log(`[Cache] SET — ${articles.length} articles cached`);
}

/**
 * Immediately invalidate the article cache.
 *
 * **MUST** be called after every successful mutation:
 * - Publish
 * - Edit (re-publish)
 * - Delete
 * - Duplicate (creates a draft — optional but safe)
 *
 * This forces the next `getAllArticles()` call to fetch fresh from GitHub.
 */
export function clearArticleCache(): void {
    deleteStore();
    console.log('[Cache] INVALIDATED');
}
