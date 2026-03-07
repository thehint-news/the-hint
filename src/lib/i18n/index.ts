/**
 * Internationalization (i18n) System
 * 
 * Exports all language-related utilities and translations.
 * Default language: Kannada (kn)
 */

// Foundations
export * from './language';

// translations
export { kn } from './kn';
import { kn } from './kn';
import { Language } from './language';

/**
 * Get translations for a specific language
 */
export function getTranslations(_lang?: Language) {
    void _lang;
    return kn;
}

/**
 * Get translations for the current language
 */
export function getTranslationsForLang(_lang?: Language | null) {
    void _lang;
    return kn;
}

// Client-side utils (placeholders for compatibility)
export function setClientLanguage(_lang: Language): void {
    void _lang;
}
export function getClientLanguage(): Language { return 'kn'; }
export function getToggleLanguage(_current: Language): Language {
    void _current;
    return 'kn';
}