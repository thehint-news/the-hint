/**
 * Post Block Utilities
 * URL detection, normalization, sanitization, and domain whitelisting
 * 
 * SECURITY RULES:
 * - Only allow known platform domains
 * - HTTPS only
 * - Reject localhost, IP addresses, suspicious redirects
 * - Strip all tracking parameters
 * - Strip all <script> tags and inline JS from embed HTML
 */

import type { PostPlatform } from './media-types';
import { SUPPORTED_POST_PLATFORMS } from './media-types';

// =============================================================================
// DOMAIN WHITELIST
// =============================================================================

/** Platform domain mappings */
const PLATFORM_DOMAINS: Record<string, PostPlatform> = {
    'twitter.com': 'x',
    'www.twitter.com': 'x',
    'mobile.twitter.com': 'x',
    'x.com': 'x',
    'www.x.com': 'x',
    'facebook.com': 'facebook',
    'www.facebook.com': 'facebook',
    'm.facebook.com': 'facebook',
    'fb.com': 'facebook',
    'www.fb.com': 'facebook',
    'fb.watch': 'facebook',
    'instagram.com': 'instagram',
    'www.instagram.com': 'instagram',
    'youtube.com': 'youtube',
    'www.youtube.com': 'youtube',
    'm.youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'linkedin.com': 'linkedin',
    'www.linkedin.com': 'linkedin',
    'tiktok.com': 'tiktok',
    'www.tiktok.com': 'tiktok',
    'vm.tiktok.com': 'tiktok',
};

/** All allowed domains */
const ALLOWED_DOMAINS = Object.keys(PLATFORM_DOMAINS);

/** Tracking parameters to strip */
const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'ref', 'ref_src', 'ref_url', 's', 'si',
    'igshid', 'igsh', 'feature', 'app', 'src',
];

// =============================================================================
// SECURITY VALIDATION
// =============================================================================

/**
 * Check if a URL is from an allowed domain.
 * HTTPS only. Rejects localhost, IPs, and unknown domains.
 */
export function isAllowedDomain(url: string): boolean {
    try {
        const parsed = new URL(url);

        // HTTPS only
        if (parsed.protocol !== 'https:') {
            return false;
        }

        // Reject localhost
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return false;
        }

        // Reject IP addresses (IPv4 and IPv6)
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname)) {
            return false;
        }
        if (parsed.hostname.startsWith('[')) {
            return false;
        }

        // Check against whitelist
        return ALLOWED_DOMAINS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

/**
 * Detect platform from a URL or embed HTML.
 * Returns null for unsupported/unknown platforms.
 */
export function detectPlatform(input: string): PostPlatform | null {
    const trimmed = input.trim();

    // If input looks like HTML (blockquote/iframe/div embed), extract URL first
    if (trimmed.startsWith('<') || trimmed.includes('<blockquote') || trimmed.includes('<iframe') || trimmed.includes('<div')) {
        const extractedUrl = extractUrlFromEmbed(trimmed);
        if (extractedUrl) {
            return detectPlatformFromUrl(extractedUrl);
        }
        return null;
    }

    // Try as direct URL
    return detectPlatformFromUrl(trimmed);
}

/**
 * Detect platform from a URL string.
 */
function detectPlatformFromUrl(url: string): PostPlatform | null {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        return PLATFORM_DOMAINS[hostname] || null;
    } catch {
        return null;
    }
}

// =============================================================================
// URL EXTRACTION FROM EMBED HTML
// =============================================================================

/**
 * Extract the canonical URL from embed HTML (e.g., Twitter blockquote, Instagram embed, YouTube iframe).
 * Strips script tags and extracts the URL from href, data-href, src, cite, or data-instgrm-permalink.
 */
export function extractUrlFromEmbed(html: string): string | null {
    // We only strip scripts here, NOT iframes, so we can extract src!
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*\/>/gi, '');

    // Find all URL-like attributes
    const urlPattern = /(?:href|data-href|src|cite|data-instgrm-permalink)=["'](https:\/\/[^"']+)["']/gi;
    let lastUrl: string | null = null;
    let match;

    while ((match = urlPattern.exec(cleaned)) !== null) {
        const urlToTest = match[1];
        if (isAllowedDomain(urlToTest)) {
            lastUrl = urlToTest;
        }
    }

    return lastUrl;
}

// =============================================================================
// URL NORMALIZATION
// =============================================================================

/**
 * Normalize a URL by stripping tracking parameters and standardizing format.
 */
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);

        // Strip tracking parameters
        for (const param of TRACKING_PARAMS) {
            parsed.searchParams.delete(param);
        }

        // Platform-specific normalization
        const hostname = parsed.hostname.toLowerCase();
        const platform = PLATFORM_DOMAINS[hostname];

        if (platform === 'x') {
            // Normalize twitter.com to x.com
            parsed.hostname = 'x.com';
            // Remove mobile prefix paths
            parsed.pathname = parsed.pathname.replace(/^\/i\/web/, '');
        }

        if (platform === 'youtube') {
            let videoId: string | null = null;
            if (hostname === 'youtu.be') {
                videoId = parsed.pathname.slice(1);
            } else if (parsed.pathname.startsWith('/embed/')) {
                videoId = parsed.pathname.slice(7).split('?')[0];
            } else if (parsed.searchParams.has('v')) {
                videoId = parsed.searchParams.get('v');
            }
            if (videoId) {
                parsed.hostname = 'www.youtube.com';
                parsed.pathname = '/watch';
                // Clear all search params to get clean URL
                Array.from(parsed.searchParams.keys()).forEach(k => parsed.searchParams.delete(k));
                parsed.searchParams.set('v', videoId);
            }
        }

        if (platform === 'facebook' && parsed.pathname === '/plugins/post.php') {
            const actualHref = parsed.searchParams.get('href');
            if (actualHref) {
                return normalizeUrl(actualHref);
            }
        }

        if (platform === 'facebook' && parsed.pathname === '/plugins/video.php') {
            const actualHref = parsed.searchParams.get('href');
            if (actualHref) {
                return normalizeUrl(actualHref);
            }
        }

        // Remove empty search string
        let result = parsed.toString();
        if (result.endsWith('?')) {
            result = result.slice(0, -1);
        }

        return result;
    } catch {
        return url;
    }
}

/**
 * Extract canonical URL from input (URL or embed HTML).
 * Returns the normalized canonical URL or null if invalid.
 */
export function extractCanonicalUrl(input: string): string | null {
    const trimmed = input.trim();

    let url: string | null = null;

    // If HTML, extract URL first
    if (trimmed.startsWith('<') || trimmed.includes('<blockquote') || trimmed.includes('<iframe') || trimmed.includes('<div')) {
        url = extractUrlFromEmbed(trimmed);
    } else if (trimmed.startsWith('https://')) {
        url = trimmed;
    }

    if (!url) return null;
    if (!isAllowedDomain(url)) return null;

    return normalizeUrl(url);
}

// =============================================================================
// HTML SANITIZATION
// =============================================================================

/**
 * Sanitize HTML content by stripping dangerous elements.
 * Removes: <script> tags, inline JS, event handlers, dangerous attributes.
 */
export function sanitizeHtml(html: string): string {
    let result = html;

    // Remove <script> tags and content
    result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    result = result.replace(/<script[^>]*\/>/gi, '');

    // Remove inline event handlers (onclick, onerror, onload, etc.)
    result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    result = result.replace(/\s+on\w+\s*=\s*\S+/gi, '');

    // Remove javascript: URLs
    result = result.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
    result = result.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');

    // Remove data: URLs (potential XSS vector)
    result = result.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

    // Remove <iframe> tags
    result = result.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    result = result.replace(/<iframe[^>]*\/>/gi, '');

    // Remove <object>, <embed>, <applet> tags
    result = result.replace(/<(object|embed|applet)[^>]*>[\s\S]*?<\/\1>/gi, '');
    result = result.replace(/<(object|embed|applet)[^>]*\/>/gi, '');

    // Remove <form> tags
    result = result.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');

    // Remove style attributes with expression() or url()
    result = result.replace(/style\s*=\s*["'][^"']*expression\([^"']*["']/gi, '');

    return result;
}

/**
 * Sanitize plain text content (metadata values).
 * Strips all HTML tags, decodes entities, and trims whitespace.
 * Also removes irrelevant social metrics (e.g., "1.7M views · 50K reactions | ").
 */
export function sanitizeText(text: string): string {
    let clean = text
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Decode hex and decimal HTML entities (e.g., &#xb7; -> ·)
    clean = clean.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    clean = clean.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Remove video stats like "1.7M views · 50K reactions | " or "1M Likes, 10K Comments - " from the beginning
    clean = clean.replace(/^[0-9.,KMBkmb]+\s+views.*?(?:\||·|-)\s*/i, '');
    clean = clean.replace(/^[0-9.,KMBkmb]+\s+likes.*?(?:\||·|-)\s*/i, '');

    return clean;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that a platform string is supported.
 */
export function isValidPlatform(platform: string): platform is PostPlatform {
    return SUPPORTED_POST_PLATFORMS.includes(platform as PostPlatform);
}

/**
 * Get display name for a platform.
 */
export function getPlatformDisplayName(platform: PostPlatform): string {
    const names: Record<PostPlatform, string> = {
        x: 'X',
        facebook: 'Facebook',
        instagram: 'Instagram',
        youtube: 'YouTube',
        linkedin: 'LinkedIn',
        tiktok: 'TikTok',
    };
    return names[platform] || platform;
}

/**
 * Get platform brand color.
 */
export function getPlatformColor(platform: PostPlatform): string {
    const colors: Record<PostPlatform, string> = {
        x: '#000000',
        facebook: '#1877F2',
        instagram: '#E4405F',
        youtube: '#FF0000',
        linkedin: '#0A66C2',
        tiktok: '#000000',
    };
    return colors[platform] || '#666666';
}
