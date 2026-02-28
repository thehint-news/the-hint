"use client";

/**
 * Client-Side Cookie Utilities
 * 
 * These functions are safe to call in browser environment.
 * For server-side cookie access, use cookies-server.ts
 */

import {
    Language,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_NAME,
    LANGUAGE_COOKIE_MAX_AGE,
    validateLanguage,
} from './language';

/**
 * Client-side: Get language from cookie
 * Safe to call in browser environment
 */
export function getClientLanguage(): Language {
    if (typeof document === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    try {
        const match = document.cookie.match(new RegExp(`(^| )${LANGUAGE_COOKIE_NAME}=([^;]+)`));
        if (match) {
            return validateLanguage(match[2]);
        }
    } catch (error) {
        console.warn('[Language] Failed to read client cookie:', error);
    }

    return DEFAULT_LANGUAGE;
}

/**
 * Client-side: Set language cookie
 * Safe to call in browser environment
 */
export function setClientLanguage(lang: Language): void {
    if (typeof document === 'undefined') {
        return;
    }

    try {
        const expires = new Date();
        expires.setTime(expires.getTime() + LANGUAGE_COOKIE_MAX_AGE * 1000);

        const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
        document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang}; expires=${expires.toUTCString()}; path=/; samesite=lax${secure}`;
    } catch (error) {
        console.error('[Language] Failed to set client cookie:', error);
    }
}