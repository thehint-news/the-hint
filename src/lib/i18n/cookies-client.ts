"use client";

/**
 * Client-Side Cookie Utilities (Kannada Only)
 */

import { Language } from './language';

/**
 * Get language (fixed to Kannada)
 */
export function getClientLanguage(): Language {
    return 'kn';
}

/**
 * Set language (no-op)
 */
export function setClientLanguage(_lang: Language): void {
    void _lang;
    // No language switching supported
}