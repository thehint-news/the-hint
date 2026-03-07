/**
 * Server-Side Cookie Utilities (Kannada Only)
 */

import { Language, DEFAULT_LANGUAGE } from './language';

/**
 * Get language (fixed to Kannada)
 */
export async function getLanguageFromCookie(): Promise<Language> {
    return DEFAULT_LANGUAGE;
}

/**
 * Set language (no-op)
 */
export async function setLanguageCookie(_lang: Language): Promise<void> {
    void _lang;
    // No language switching supported
}

/**
 * Delete language cookie (no-op)
 */
export async function deleteLanguageCookie(): Promise<void> {
    // No language switching supported
}