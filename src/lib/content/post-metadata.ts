/**
 * Post Metadata Service
 * Server-side Open Graph metadata fetching for social post embeds
 * 
 * RULES:
 * - All metadata fetched SERVER-SIDE only
 * - Metadata is a snapshot at insert time (cached in block)
 * - No client-side fetching allowed
 * - No platform SDK dependencies
 * - All content sanitized before storage
 */

import type { PostPlatform, PostMetadata } from './media-types';
import { sanitizeText } from './post-utils';

// =============================================================================
// METADATA FETCHING
// =============================================================================

/**
 * Fetch post metadata from a URL.
 * Uses Open Graph tags and platform-specific parsing.
 * Returns a clean, sanitized PostMetadata object.
 */
export async function fetchPostMetadata(
    url: string,
    platform: PostPlatform
): Promise<PostMetadata> {
    try {
        // Fetch the page HTML with a bot User-Agent to ensure we get rich OpenGraph tags
        const response = await fetch(url, {
            headers: {
                // facebookexternalhit gets the best static OG responses from Instagram/TikTok/etc.
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            return createFallbackMetadata(url, platform);
        }

        const html = await response.text();
        const ogTags = parseOpenGraphTags(html);

        // Build metadata from OG tags + platform-specific extraction
        const metadata = buildMetadata(ogTags, url, platform, html);

        return metadata;
    } catch (error) {
        console.error(`[PostMetadata] Failed to fetch metadata for ${url}:`, error);
        return createFallbackMetadata(url, platform);
    }
}

// =============================================================================
// OPEN GRAPH TAG PARSING
// =============================================================================

/**
 * Parse Open Graph meta tags from HTML.
 * Extracts og:*, twitter:*, and standard meta tags.
 */
function parseOpenGraphTags(html: string): Record<string, string> {
    const tags: Record<string, string> = {};

    // Match <meta> tags with property or name attributes
    // Handles: <meta property="og:title" content="..." />
    //          <meta name="twitter:title" content="..." />
    //          <meta name="description" content="..." />
    const metaPattern = /<meta\s+(?:[^>]*?\s+)?(?:property|name)\s*=\s*["']([^"']+)["']\s+(?:[^>]*?\s+)?content\s*=\s*["']([^"']*?)["']/gi;

    let match;
    while ((match = metaPattern.exec(html)) !== null) {
        tags[match[1].toLowerCase()] = match[2];
    }

    // Also try reversed attribute order: <meta content="..." property="..." />
    const reversePattern = /<meta\s+(?:[^>]*?\s+)?content\s*=\s*["']([^"']*?)["']\s+(?:[^>]*?\s+)?(?:property|name)\s*=\s*["']([^"']+)["']/gi;

    while ((match = reversePattern.exec(html)) !== null) {
        const key = match[2].toLowerCase();
        if (!tags[key]) {
            tags[key] = match[1];
        }
    }

    // Extract <title> tag as fallback
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch && !tags['og:title']) {
        tags['page:title'] = titleMatch[1].trim();
    }

    return tags;
}

// =============================================================================
// METADATA BUILDING
// =============================================================================

/**
 * Build a clean PostMetadata from parsed OG tags and platform-specific data.
 */
function buildMetadata(
    ogTags: Record<string, string>,
    url: string,
    platform: PostPlatform,
    html: string
): PostMetadata {
    // Extract author info
    const authorInfo = extractAuthorInfo(ogTags, url, platform, html);

    // Text preview: use og:description or twitter:description
    const rawTextPreview =
        ogTags['og:description'] ||
        ogTags['twitter:description'] ||
        ogTags['description'] ||
        '';

    // Thumbnail: use og:image or twitter:image
    let rawThumbnail =
        ogTags['og:image'] ||
        ogTags['og:image:secure_url'] ||
        ogTags['twitter:image'] ||
        ogTags['twitter:image:src'] ||
        ogTags['thumbnail'] ||
        undefined;

    // Platform-specific thumbnail extraction when OG tags fail or perform poorly
    switch (platform) {
        case 'youtube': {
            // YouTube thumbnail from video ID provides high-res frame
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/i);
            if (ytMatch && ytMatch[1]) {
                // Use maxresdefault for highest quality frame
                rawThumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
            }
            break;
        }
        case 'tiktok': {
            // Sometimes TikTok OG image is a generic logo, check if there's a specific playing frame in html
            if (!rawThumbnail) {
                const ttImageMatch = html.match(/"dynamicCover":"([^"]+)"/i) || html.match(/"coverUrl":"([^"]+)"/i);
                if (ttImageMatch && ttImageMatch[1]) {
                    rawThumbnail = ttImageMatch[1].replace(/\\u002F/g, '/');
                }
            }
            break;
        }
    }

    // Timestamp
    const rawTimestamp =
        ogTags['article:published_time'] ||
        ogTags['og:updated_time'] ||
        ogTags['date'] ||
        undefined;

    return {
        author: sanitizeText(authorInfo.author),
        username: sanitizeText(authorInfo.username),
        avatar: authorInfo.avatar,
        textPreview: sanitizeText(rawTextPreview).substring(0, 500), // Max 500 chars
        thumbnail: rawThumbnail ? sanitizeImageUrl(rawThumbnail) : undefined,
        timestamp: rawTimestamp ? normalizeTimestamp(rawTimestamp) : undefined,
        verified: undefined, // Cannot reliably determine from OG tags
    };
}

/**
 * Extract author information from OG tags and URL patterns.
 */
function extractAuthorInfo(
    ogTags: Record<string, string>,
    url: string,
    platform: PostPlatform,
    html: string
): { author: string; username: string; avatar?: string } {
    let author = '';
    let username = '';
    let avatar: string | undefined;

    // Try OG tags first
    author = ogTags['og:title'] || ogTags['twitter:title'] || ogTags['page:title'] || '';
    const siteUser = ogTags['twitter:creator'] || ogTags['article:author'] || '';

    // Platform-specific username extraction from URL
    switch (platform) {
        case 'x': {
            // URL pattern: https://x.com/username/status/123
            const xMatch = url.match(/x\.com\/([^/]+)\/status/i) ||
                url.match(/twitter\.com\/([^/]+)\/status/i);
            if (xMatch) {
                username = `@${xMatch[1]}`;
                if (!author) author = xMatch[1];
            }
            break;
        }
        case 'instagram': {
            // URL pattern: https://www.instagram.com/p/CODE/ or /reel/CODE/
            const igUserMatch = url.match(/instagram\.com\/([^/]+)\/(?:p|reel)\//i);
            if (igUserMatch && igUserMatch[1] !== 'p' && igUserMatch[1] !== 'reel') {
                username = `@${igUserMatch[1]}`;
                if (!author) author = igUserMatch[1];
            }
            // Try from OG tags
            if (!username && siteUser) {
                username = siteUser.startsWith('@') ? siteUser : `@${siteUser}`;
            }
            break;
        }
        case 'facebook': {
            // Facebook OG tags usually contain author info
            if (ogTags['og:site_name']) {
                author = author || ogTags['og:site_name'];
            }
            username = siteUser || '';
            break;
        }
        case 'youtube': {
            // URL pattern: https://www.youtube.com/watch?v=ID
            // Author often in og:title
            if (ogTags['og:site_name'] === 'YouTube') {
                // og:title is video title, need channel name
                // Try extracting from HTML
                const channelMatch = html.match(/"ownerChannelName"\s*:\s*"([^"]+)"/);
                if (channelMatch) {
                    username = channelMatch[1];
                }
            }
            break;
        }
        case 'linkedin': {
            author = ogTags['og:title'] || '';
            username = siteUser || '';
            break;
        }
        case 'tiktok': {
            // URL pattern: https://www.tiktok.com/@username/video/ID
            const ttMatch = url.match(/tiktok\.com\/@([^/]+)/i);
            if (ttMatch) {
                username = `@${ttMatch[1]}`;
                if (!author) author = ttMatch[1];
            }
            break;
        }
    }

    // Fallback: derive from URL
    if (!author) {
        try {
            const parsed = new URL(url);
            author = parsed.hostname.replace('www.', '');
        } catch {
            author = platform;
        }
    }

    if (!username) {
        username = siteUser || '';
    }

    // Try to get avatar from platform-specific patterns
    if (platform === 'x' && username) {
        const handle = username.replace('@', '');
        // Use unavatar.io as a free, reliable avatar service
        avatar = `https://unavatar.io/twitter/${handle}`;
    }

    return { author, username, avatar };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create fallback metadata when fetch fails.
 */
function createFallbackMetadata(url: string, platform: PostPlatform): PostMetadata {
    let username = '';
    let author = '';

    try {
        const parsed = new URL(url);
        author = parsed.hostname.replace('www.', '');

        // Try to extract username from URL path
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0 && pathParts[0] !== 'p' && pathParts[0] !== 'status') {
            username = `@${pathParts[0].replace('@', '')}`;
        }
    } catch {
        author = platform;
    }

    return {
        author,
        username,
        textPreview: '',
        thumbnail: undefined,
        timestamp: undefined,
    };
}

/**
 * Sanitize an image URL (ensure HTTPS, no data: URIs).
 */
function sanitizeImageUrl(url: string): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('data:')) return undefined;
    if (url.startsWith('javascript:')) return undefined;

    // If protocol-relative, add https
    if (url.startsWith('//')) {
        return `https:${url}`;
    }

    // Must be https
    if (url.startsWith('https://')) {
        return url;
    }

    // If http, upgrade to https
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }

    return undefined;
}

/**
 * Normalize a timestamp string to ISO 8601.
 */
function normalizeTimestamp(timestamp: string): string | undefined {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return undefined;
        return date.toISOString();
    } catch {
        return undefined;
    }
}
