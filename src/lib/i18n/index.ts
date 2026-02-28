/**
 * Internationalization (i18n) System
 * 
 * Exports all language-related utilities and translations.
 * Default language: Kannada (kn)
 * Secondary language: English (en)
 * 
 * NOTE: Server-only utilities (getLanguageFromCookie, setLanguageCookie) 
 * must be imported directly from './cookies-server'
 */

// Core language utilities
export {
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    SECONDARY_LANGUAGE,
    LANGUAGE_COOKIE_NAME,
    LANGUAGE_COOKIE_MAX_AGE,
    LANGUAGE_DISPLAY_NAMES,
    isValidLanguage,
    validateLanguage,
    getToggleLanguage,
    isExcludedRoute,
    classifyRoute,
} from './language';

export type { Language, RouteType } from './language';

// Client-side cookie utilities (safe for both server and client)
export {
    getClientLanguage,
    setClientLanguage,
} from './cookies-client';

// Translations
export { kn } from './kn';
export { en } from './en';
export type { Translations } from './en';

import { Language } from './language';
import { kn } from './kn';
import { en } from './en';

/** Translation dictionary by language code */
export const translations = {
    kn,
    en,
} as const;

/**
 * Get translations for a specific language
 * Falls back to Kannada if language is invalid
 */
export function getTranslations(lang: Language) {
    return translations[lang] ?? kn;
}

/**
 * Get translations for the current language
 * Server-safe: returns Kannada if called during SSR without context
 */
export function getTranslationsForLang(lang?: Language | null) {
    if (lang && lang in translations) {
        return translations[lang as Language];
    }
    return kn;
}

// Article translation utilities
export {
    applyArticleTranslation,
    applyArticleTranslations,
    hasTranslation,
    getArticleTranslationInfo,
    createLocalizedArticle,
} from './article-translations';

// Route-based language utilities (for SEO bilingual indexing)
export {
    detectLanguageFromPath,
    getAlternateLanguageUrl,
    getCanonicalUrl,
    buildArticleHrefLang,
    buildSectionHrefLang,
    hasEnglishTranslation,
    getDataPath,
} from './route-utils';

export type {
    ArticleTranslation,
    ArticleTranslations,
} from '@/lib/content/types';