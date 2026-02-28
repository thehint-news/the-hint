/**
 * Article Translation Helpers
 * Utilities for getting translated article content
 */

import { Article } from '@/lib/content/types';
import { Language, DEFAULT_LANGUAGE } from './language';

/**
 * Translated article content
 */
export interface TranslatedArticleContent {
    title: string;
    subtitle: string;
    body?: string;
    excerpt: string;
    bodyBlocks?: Article['bodyBlocks'];
    isTranslated: boolean;
    translatedAt?: string;
}

/**
 * Get article content for a specific language
 * Falls back to Kannada if translation not available
 */
export function getArticleContent(
    article: Article,
    lang: Language
): TranslatedArticleContent {
    // If Kannada requested, return original
    if (lang === DEFAULT_LANGUAGE) {
        return {
            title: article.title,
            subtitle: article.subtitle,
            body: article.body,
            excerpt: article.subtitle || article.body?.slice(0, 200) || '',
            bodyBlocks: article.bodyBlocks,
            isTranslated: false,
        };
    }

    // Get English translation if available
    const translation = article.translations?.en;

    if (translation) {
        return {
            title: translation.title,
            subtitle: translation.subtitle,
            body: translation.body,
            excerpt: translation.excerpt || translation.subtitle,
            bodyBlocks: translation.bodyBlocks || article.bodyBlocks,
            isTranslated: true,
            translatedAt: translation.translatedAt,
        };
    }

    // Fallback to Kannada if no translation
    return {
        title: article.title,
        subtitle: article.subtitle,
        body: article.body,
        excerpt: article.subtitle || article.body?.slice(0, 200) || '',
        bodyBlocks: article.bodyBlocks,
        isTranslated: false,
    };
}

/**
 * Check if article has translation for a language
 */
export function hasTranslation(article: Article, lang: Language): boolean {
    if (lang === DEFAULT_LANGUAGE) return true;
    return !!article.translations?.[lang];
}

/**
 * Check if article translation is stale
 * (article was updated after translation)
 */
export function isTranslationStale(article: Article, lang: Language): boolean {
    if (lang === DEFAULT_LANGUAGE) return false;

    const translation = article.translations?.[lang];
    if (!translation) return true; // No translation = stale

    const articleUpdatedAt = article.updatedAt || article.publishedAt;
    const translatedAt = translation.translatedAt;

    return new Date(articleUpdatedAt) > new Date(translatedAt);
}

/**
 * Get translated SEO metadata for article
 */
export function getArticleSEO(
    article: Article,
    lang: Language,
    baseUrl: string
): {
    title: string;
    description: string;
    url: string;
    noindex: boolean;
} {
    const content = getArticleContent(article, lang);
    const url = `${baseUrl}/${article.section}/${article.id}`;

    return {
        title: content.title,
        description: content.excerpt.slice(0, 160),
        url,
        noindex: lang !== DEFAULT_LANGUAGE, // Option A: English is noindex
    };
}
