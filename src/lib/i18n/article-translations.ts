/**
 * Article Translation Utilities
 * 
 * Handles applying translations to articles based on language preference.
 * NO runtime translation - only applies pre-generated translations.
 * Falls back to Kannada (original) if translation not available.
 */

import { Language, DEFAULT_LANGUAGE } from './language';
import { Article } from '@/lib/content/types';

/**
 * Apply translation to an article
 * Returns a new article object with translated content (if available)
 * Falls back to original if translation doesn't exist or is not ready
 */
export function applyArticleTranslation(
    article: Article,
    language: Language
): Article {
    // Kannada is the source of truth - no transformation needed
    if (language === DEFAULT_LANGUAGE) {
        return article;
    }

    // Check if translation exists for the requested language
    const translation = article.translations?.[language];
    if (!translation || translation.status === 'pending' || translation.status === 'failed') {
        // Fallback to original Kannada
        return article;
    }

    // Create new article with translated content
    return {
        ...article,
        title: translation.title,
        subtitle: translation.subtitle,
        // Use translated body if available
        ...(translation.body && { body: translation.body }),
        // Only override bodyBlocks if translation has them
        ...(translation.bodyBlocks && { bodyBlocks: translation.bodyBlocks }),
    };
}

/**
 * Check if an article has a VALID translation for the given language
 */
export function hasTranslation(article: Article, language: Language): boolean {
    if (language === DEFAULT_LANGUAGE) {
        return true; // Original is always available
    }
    const t = article.translations?.[language];
    return !!(t && t.status !== 'pending' && t.status !== 'failed');
}

/**
 * Get translation metadata for an article
 * Returns info about available translations without applying them
 */
export function getArticleTranslationInfo(article: Article): {
    hasEnglishTranslation: boolean;
    translatedAt: string | null;
    status: 'pending' | 'ready' | 'failed' | null;
} {
    const enTranslation = article.translations?.en;
    return {
        hasEnglishTranslation: !!(enTranslation && enTranslation.status !== 'pending' && enTranslation.status !== 'failed'),
        translatedAt: enTranslation?.translatedAt ?? null,
        status: enTranslation?.status ?? null,
    };
}

/**
 * Apply translations to a list of articles
 * Used for section pages, homepages, etc.
 */
export function applyArticleTranslations(
    articles: Article[],
    language: Language
): Article[] {
    if (language === DEFAULT_LANGUAGE) {
        return articles;
    }
    return articles.map(article => applyArticleTranslation(article, language));
}

/**
 * Create a translated version of article data for API responses
 * This ensures consistent shape between Kannada and translated versions
 */
export function createLocalizedArticle(
    article: Article,
    language: Language
): Article & { _originalLanguage: Language; _isTranslated: boolean } {
    const translated = applyArticleTranslation(article, language);
    const hasTrans = hasTranslation(article, language);

    return {
        ...translated,
        _originalLanguage: DEFAULT_LANGUAGE,
        _isTranslated: language !== DEFAULT_LANGUAGE && hasTrans,
    };
}