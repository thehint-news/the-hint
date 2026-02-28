/**
 * Server-Side Cookie Utilities
 * 
 * These functions must only be called in Server Components or API Routes.
 * For client-side cookie access, use cookies-client.ts
 */

import { cookies } from 'next/headers';
import {
    Language,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_NAME,
    LANGUAGE_COOKIE_MAX_AGE,
    validateLanguage,
} from './language';

/**
 * Cookie options for language cookie
 */
export const LANGUAGE_COOKIE_OPTIONS = {
    maxAge: LANGUAGE_COOKIE_MAX_AGE,
    httpOnly: false, // Allow client-side access for toggle
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

/**
 * Get language from cookies (server-side only)
 * Must be called in async context (Server Component or API Route)
 */
export async function getLanguageFromCookie(): Promise<Language> {
    try {
        const cookieStore = await cookies();
        const langCookie = cookieStore.get(LANGUAGE_COOKIE_NAME);

        if (langCookie?.value) {
            return validateLanguage(langCookie.value);
        }
    } catch (error) {
        // Cookies not available (e.g., during static generation)
        console.warn('[Language] Failed to read cookie:', error);
    }

    return DEFAULT_LANGUAGE;
}

/**
 * Set language cookie (server-side only)
 * Must be called in async context
 */
export async function setLanguageCookie(lang: Language): Promise<void> {
    try {
        const cookieStore = await cookies();
        cookieStore.set(LANGUAGE_COOKIE_NAME, lang, LANGUAGE_COOKIE_OPTIONS);
    } catch (error) {
        console.error('[Language] Failed to set cookie:', error);
    }
}

/**
 * Delete language cookie (server-side only)
 */
export async function deleteLanguageCookie(): Promise<void> {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(LANGUAGE_COOKIE_NAME);
    } catch (error) {
        console.error('[Language] Failed to delete cookie:', error);
    }
}