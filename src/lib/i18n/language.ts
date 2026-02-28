/**
 * Language System Foundation
 * 
 * Defines supported languages, validation, and type guards.
 * Default: Kannada (kn)
 * Secondary: English (en)
 */

/** Supported language codes */
export type Language = 'kn' | 'en';

/** Supported languages array for iteration */
export const SUPPORTED_LANGUAGES: Language[] = ['kn', 'en'];

/** Default language (Kannada) */
export const DEFAULT_LANGUAGE: Language = 'kn';

/** Secondary language (English) */
export const SECONDARY_LANGUAGE: Language = 'en';

/** Cookie name for language persistence */
export const LANGUAGE_COOKIE_NAME = 'site_lang';

/** Cookie max age in seconds (1 year) */
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Language display names for UI */
export const LANGUAGE_DISPLAY_NAMES: Record<Language, string> = {
    kn: 'ಕನ್ನಡ',
    en: 'English',
};

/**
 * Type guard to check if a value is a valid Language
 */
export function isValidLanguage(value: unknown): value is Language {
    return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as Language);
}

/**
 * Validate and normalize language code
 * Returns default language if invalid
 */
export function validateLanguage(lang: unknown): Language {
    if (isValidLanguage(lang)) {
        return lang;
    }
    return DEFAULT_LANGUAGE;
}

/**
 * Get the other language (toggle target)
 */
export function getToggleLanguage(current: Language): Language {
    return current === 'kn' ? 'en' : 'kn';
}

/**
 * Check if a route should be excluded from language switching
 * These routes remain English-only / Kannada-only regardless of cookie
 */
export function isExcludedRoute(pathname: string): boolean {
    const excludedPrefixes = [
        '/publish',
        '/newsroom',
        '/api',
        '/admin',
        '/_next',
        '/favicon',
        '/robots.txt',
        '/sitemap.xml',
    ];

    return excludedPrefixes.some(prefix =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

/**
 * Route type classification
 */
export type RouteType = 'public' | 'excluded' | 'system';

/**
 * Classify a route for language handling
 */
export function classifyRoute(pathname: string): RouteType {
    // System routes
    if (pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml') {
        return 'system';
    }

    // Excluded routes
    if (isExcludedRoute(pathname)) {
        return 'excluded';
    }

    return 'public';
}