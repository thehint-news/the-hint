/**
 * Language System Foundation
 * 
 * Defines supported languages.
 * Default: Kannada (kn)
 */

/** Supported language codes */
export type Language = 'kn';

/** Supported languages array for iteration */
export const SUPPORTED_LANGUAGES: Language[] = ['kn'];

/** Default language (Kannada) */
export const DEFAULT_LANGUAGE: Language = 'kn';

/** Language display names for UI */
export const LANGUAGE_DISPLAY_NAMES: Record<Language, string> = {
    kn: 'ಕನ್ನಡ',
};

/**
 * Type guard to check if a value is a valid Language
 */
export function isValidLanguage(value: unknown): value is Language {
    return value === 'kn';
}

/**
 * Validate and normalize language code
 */
export function validateLanguage(_lang: unknown): Language {
    void _lang;
    return DEFAULT_LANGUAGE;
}