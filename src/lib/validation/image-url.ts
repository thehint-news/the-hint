/**
 * Canonical Image URL Validation Module
 * 
 * Server-side validation for article image URLs, thumbnails, lead media, and body blocks.
 * Enforces origin boundaries and rejects dangerous schemes, local/private IPs, and unapproved hosts.
 * 
 * DESIGN RULES:
 * - Accepts only absolute HTTPS URLs from approved storage origins (or valid local site-root paths)
 * - Strict URL parsing — no substring matching (e.g. url.includes('supabase.co'))
 * - Rejects javascript:, data:, blob:, file:, http:, localhost, private/link-local IPs
 * - Rejects userinfo, deceptive subdomains, and unapproved external origins
 */

export interface ImageUrlValidationResult {
    isValid: boolean;
    error?: string;
    normalizedUrl?: string;
}

/**
 * Validate that an image URL belongs to an approved image storage origin
 * (currently configured Supabase Storage project or site-root assets).
 */
export function validateArticleImageUrl(url: unknown): ImageUrlValidationResult {
    if (!url || typeof url !== 'string') {
        return { isValid: false, error: 'Image URL is required' };
    }

    const trimmed = url.trim();
    if (!trimmed) {
        return { isValid: false, error: 'Image URL cannot be empty' };
    }

    // Reject dangerous schemes immediately
    const lower = trimmed.toLowerCase();
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:') ||
        lower.startsWith('file:') ||
        lower.startsWith('vbscript:')
    ) {
        return { isValid: false, error: 'Dangerous URL scheme is not allowed' };
    }

    // Handle site-relative paths (e.g. /brand/logo.png, /media/...)
    if (trimmed.startsWith('/')) {
        if (trimmed.startsWith('//')) {
            return { isValid: false, error: 'Protocol-relative URLs are not allowed' };
        }
        if (trimmed.startsWith('/brand/') || trimmed.startsWith('/media/') || trimmed.startsWith('/images/')) {
            return { isValid: true, normalizedUrl: trimmed };
        }
        return { isValid: false, error: 'Relative image URL must start with /brand/, /media/, or /images/' };
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { isValid: false, error: 'Invalid URL format' };
    }

    // 1. Must use HTTPS
    if (parsed.protocol !== 'https:') {
        return { isValid: false, error: 'Image URL must use HTTPS' };
    }

    // 2. Reject userinfo (@) tricks
    if (parsed.username || parsed.password) {
        return { isValid: false, error: 'Userinfo in URL is not allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 3. Reject localhost, loopback, private IPs, and numeric hostnames
    if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('169.254.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        hostname.includes(':')
    ) {
        return { isValid: false, error: 'Local or private network image URLs are not allowed' };
    }

    // 4. Validate against approved origins
    // A. Configured Supabase project storage
    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vknkmbsapbnahnlkwbnz.supabase.co';
    let configuredHost = '';
    try {
        configuredHost = new URL(configuredSupabaseUrl).hostname.toLowerCase();
    } catch {
        configuredHost = 'vknkmbsapbnahnlkwbnz.supabase.co';
    }

    const isConfiguredSupabaseHost = hostname === configuredHost;
    const isSupabaseDomain = /^[a-z0-9_-]+\.supabase\.co$/.test(hostname);

    if (isConfiguredSupabaseHost || isSupabaseDomain) {
        // Must target public storage path
        if (!parsed.pathname.startsWith('/storage/v1/object/public/')) {
            return { isValid: false, error: 'Supabase URL must point to public storage path (/storage/v1/object/public/)' };
        }
        return { isValid: true, normalizedUrl: parsed.href };
    }

    // B. Primary site URL (for brand/media assets)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    let siteHost = 'www.thehintnews.in';
    try {
        siteHost = new URL(siteUrl).hostname.toLowerCase();
    } catch {
        siteHost = 'www.thehintnews.in';
    }

    if (hostname === siteHost || hostname === 'thehintnews.in') {
        if (parsed.pathname.startsWith('/brand/') || parsed.pathname.startsWith('/media/')) {
            return { isValid: true, normalizedUrl: parsed.href };
        }
    }

    return {
        isValid: false,
        error: `Image host "${hostname}" is not an approved image storage origin (approved: Supabase Storage)`
    };
}
