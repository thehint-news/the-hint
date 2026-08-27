/**
 * Safe JSON-LD Serialization
 * 
 * Prevents Stored XSS via JSON-LD script breakouts by safely escaping characters
 * that could terminate a script block (e.g., </script>) or introduce executable HTML.
 */
export function safeJsonLdStringify(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}
