/**
 * Route-based Language Utilities
 * 
 * Detects language from URL route segment instead of cookies.
 * For SEO bilingual indexing with /en/ prefixed routes.
 */

import { Language, DEFAULT_LANGUAGE, SECONDARY_LANGUAGE } from './language';

/**
 * Detect language from pathname
 * /en/... -> 'en'
 * /... -> 'kn' (default)
 */
export function detectLanguageFromPath(pathname: string): Language {
    // Check if pathname starts with /en/
    if (pathname.startsWith('/en/') || pathname === '/en') {
        return SECONDARY_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
}

/**
 * Build alternate language URL
 * /politics/article -> /en/politics/article
 * /en/politics/article -> /politics/article
 */
export function getAlternateLanguageUrl(pathname: string): string {
    const lang = detectLanguageFromPath(pathname);

    if (lang === DEFAULT_LANGUAGE) {
        // Add /en prefix
        return pathname === '/' ? '/en' : `/en${pathname}`;
    } else {
        // Remove /en prefix
        return pathname.replace(/^\/en/, '') || '/';
    }
}

/**
 * Get canonical URL for a given language
 * Removes /en prefix for Kannada, keeps it for English
 */
export function getCanonicalUrl(pathname: string, lang: Language): string {
    if (lang === DEFAULT_LANGUAGE) {
        // Remove /en if present
        return pathname.replace(/^\/en/, '') || '/';
    }
    // Add /en if not present
    return pathname.startsWith('/en') ? pathname : `/en${pathname}`;
}

/**
 * Build hreflang URLs for an article
 */
export function buildArticleHrefLang(
    section: string,
    slug: string,
    siteUrl: string
): {
    kn: string;
    en: string;
    xDefault: string;
} {
    const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    return {
        kn: `${baseUrl}/${section}/${slug}`,
        en: `${baseUrl}/en/${section}/${slug}`,
        xDefault: `${baseUrl}/${section}/${slug}`,
    };
}

/**
 * Build hreflang URLs for a section
 */
export function buildSectionHrefLang(
    section: string,
    siteUrl: string
): {
    kn: string;
    en: string;
    xDefault: string;
} {
    const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    return {
        kn: `${baseUrl}/${section}`,
        en: `${baseUrl}/en/${section}`,
        xDefault: `${baseUrl}/${section}`,
    };
}

/**
 * Check if article has English translation available
 */
export function hasEnglishTranslation(article: {
    translations?: { en?: { title?: string } };
}): boolean {
    return !!article.translations?.en?.title;
}

/**
 * Remove /en prefix from pathname for data fetching
 * Data fetching always uses the original slug
 */
export function getDataPath(pathname: string): string {
    return pathname.replace(/^\/en/, '') || '/';
}
