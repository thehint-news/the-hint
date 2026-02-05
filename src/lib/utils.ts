/**
 * Utility functions for safety and formatting
 */

/**
 * Safely format a date string
 * Returns "Recent" or fallback if date is invalid
 */
export function formatSafeDate(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleDateString('en-US', options || {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

/**
 * Truncate text safely
 */
export function truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
