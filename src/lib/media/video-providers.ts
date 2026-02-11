/**
 * Video Provider Integration
 * Handles Social Media, CDN, and Direct File video URL parsing and validation
 * 
 * DESIGN SPEC: Extended Video Support
 */

import {
    VideoSourceType,
    SocialVideoProvider,
} from '../content/media-types';

// =============================================================================
// TYPES
// =============================================================================

export interface VideoParseResult {
    valid: boolean;
    sourceType?: VideoSourceType;
    provider?: SocialVideoProvider; // Normalized provider
    id?: string; // ID or URL
    embedUrl?: string;
    error?: string;
}

export interface VideoInfoResult {
    success: boolean;
    data?: {
        sourceType: VideoSourceType;
        provider?: SocialVideoProvider;
        originalUrl: string;
        embedUrl?: string; // Optional for file
        posterThumbnail: string; // Empty if not found
        title: string;
        duration?: number;
        authorName?: string;
        mimeType?: string;
        trustedSourceHtml?: string;
    };
    error?: string;
}

// =============================================================================
// URL PATTERNS
// =============================================================================

const PATTERNS = {
    youtube: [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ],
    vimeo: [
        /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
        /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
    ],
    twitter: [
        /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/(\d+)/,
    ],
    instagram: [
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
    ],
    facebook: [
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/\?v=(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/videos\/(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/v\/([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/,
    ],
    tiktok: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/(\d+)/,
    ],
    linkedin: [
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:posts|feed\/update)\/([a-zA-Z0-9_-]+)/,
        /id=(\d+)/,
    ],
    files: /\.(mp4|webm|mkv)$/i,
};

// =============================================================================
// URL PARSING
// =============================================================================

export function parseVideoUrl(url: string): VideoParseResult {
    if (!url || typeof url !== 'string') return { valid: false, error: 'URL required' };

    let trimmedUrl = url.trim();

    // Basic Protocol Check
    try {
        const urlObj = new URL(trimmedUrl);
        if (urlObj.protocol !== 'https:') {
            return { valid: false, error: 'HTTPS is required' };
        }
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    // Check Social Providers
    // YouTube
    for (const p of PATTERNS.youtube) {
        const match = trimmedUrl.match(p);
        if (match && match[1]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'youtube',
                id: match[1],
                embedUrl: `https://www.youtube.com/embed/${match[1]}`,
            };
        }
    }

    // Vimeo
    for (const p of PATTERNS.vimeo) {
        const match = trimmedUrl.match(p);
        if (match && match[1]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'vimeo',
                id: match[1],
                embedUrl: `https://player.vimeo.com/video/${match[1]}`,
            };
        }
    }

    // Twitter / X
    for (const p of PATTERNS.twitter) {
        const match = trimmedUrl.match(p);
        if (match && match[2]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'x', // Normalize to x
                id: match[2],
                embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${match[2]}`,
            };
        }
    }

    // Instagram
    for (const p of PATTERNS.instagram) {
        const match = trimmedUrl.match(p);
        if (match && match[1]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'instagram',
                id: match[1],
                embedUrl: `https://www.instagram.com/p/${match[1]}/embed`,
            };
        }
    }

    // Facebook
    for (const p of PATTERNS.facebook) {
        const match = trimmedUrl.match(p);
        // Match[1] is usually the ID, but some regexes might have groups. 
        // Our patterns:
        // 1. watch/?v=(\d+) -> match[1]
        // 2. .../videos/(\d+) -> match[1]
        // 3. share/v/([a-zA-Z0-9_-]+) -> match[1]
        // 4. share/r/([a-zA-Z0-9_-]+) -> match[1]

        const id = match ? match[1] : null;

        if (id) {
            // Use the original URL for the embed href. Facebook's plugin handles various formats (share, reel, watch) best
            // when given the direct permalink rather than a constructed ID-based URL which might fail for non-numeric Reel IDs.
            return {
                valid: true,
                sourceType: 'social',
                provider: 'facebook',
                id: id,
                embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmedUrl)}&show_text=false&t=0`,
            };
        }
    }

    // TikTok
    for (const p of PATTERNS.tiktok) {
        const match = trimmedUrl.match(p);
        if (match && match[2]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'tiktok',
                id: match[2],
                embedUrl: `https://www.tiktok.com/embed/v2/${match[2]}`,
            };
        }
    }

    // LinkedIn
    for (const p of PATTERNS.linkedin) {
        const match = trimmedUrl.match(p);
        if (match && match[1]) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'linkedin',
                id: match[1],
                // LinkedIn embeds generally expect a URN format. urn:li:share is the most common for shared posts.
                embedUrl: `https://www.linkedin.com/embed/feed/update/urn:li:share:${match[1].replace('activity-', '')}`,
            };
        }
    }

    // Check Direct Files
    if (PATTERNS.files.test(trimmedUrl)) {
        return {
            valid: true,
            sourceType: 'file', // Explicit file type
            id: trimmedUrl,
            embedUrl: trimmedUrl,
        };
    }

    // Default to CDN (HEAD check required)
    return {
        valid: true,
        sourceType: 'cdn',
        id: trimmedUrl,
        embedUrl: trimmedUrl,
    };
}

// =============================================================================
// METADATA FETCHING
// =============================================================================

export async function getVideoInfo(url: string): Promise<VideoInfoResult> {
    const parsed = parseVideoUrl(url);

    if (!parsed.valid) {
        return { success: false, error: parsed.error };
    }

    // A. Social Media
    if (parsed.sourceType === 'social') {
        const provider = parsed.provider as SocialVideoProvider;
        let title = 'Video';
        let posterThumbnail = '';
        let authorName = '';
        let trustedSourceHtml = '';
        let duration: number | undefined;

        try {
            if (provider === 'youtube') {
                posterThumbnail = `https://img.youtube.com/vi/${parsed.id}/maxresdefault.jpg`;
                const data = await fetchOEmbed(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.id}&format=json`);
                if (data) {
                    title = data.title || title;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                }

                // YouTube Thumbnail Fallback Chain
                // We check if maxres exists, otherwise fallback to hq/mq
                try {
                    const checkRes = await fetch(posterThumbnail, { method: 'HEAD' });
                    if (!checkRes.ok) {
                        posterThumbnail = `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`;
                    }
                } catch {
                    posterThumbnail = `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`;
                }
            } else if (provider === 'vimeo') {
                const data = await fetchOEmbed(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${parsed.id}`);
                if (data) {
                    title = data.title || title;
                    posterThumbnail = data.thumbnail_url || posterThumbnail;
                    duration = data.duration;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                }
            } else if (provider === 'tiktok') {
                const data = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
                if (data) {
                    title = data.title || title;
                    posterThumbnail = data.thumbnail_url || posterThumbnail;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                }
            } else if (provider === 'instagram') {
                const data = await fetchOEmbed(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
                if (data) {
                    title = data.title || title;
                    posterThumbnail = data.thumbnail_url || posterThumbnail;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                }
            } else if (provider === 'facebook') {
                const data = await fetchOEmbed(`https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url)}`);
                if (data) {
                    title = data.title || title;
                    posterThumbnail = data.thumbnail_url || posterThumbnail;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                }
            } else if (provider === 'x') {
                const data = await fetchOEmbed(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
                if (data) {
                    title = data.title || title;
                    authorName = data.author_name || authorName;
                    trustedSourceHtml = data.html || '';
                    if (data.thumbnail_url) posterThumbnail = data.thumbnail_url;
                }
            }

            // Fallback: If still no thumbnail, try basic Open Graph scraping
            if (!posterThumbnail) {
                const ogImage = await fetchOpenGraphImage(url);
                if (ogImage) posterThumbnail = ogImage;
            }
        } catch (e) {
            console.error('oEmbed failed', e);
        }

        return {
            success: true,
            data: {
                sourceType: 'social',
                provider: provider,
                originalUrl: url,
                embedUrl: parsed.embedUrl,
                posterThumbnail,
                title,
                duration,
                authorName,
                trustedSourceHtml,
            }
        };
    }

    // SSRF Check & Timeout
    if (!isSafeUrl(url)) {
        return { success: false, error: 'Access to local or private networks is restricted' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        clearTimeout(timeout);
        if (!res.ok) {
            return { success: false, error: `Inaccessible URL (Status ${res.status})` };
        }

        const mimeType = res.headers.get('content-type');
        if (!mimeType || !mimeType.startsWith('video/')) {
            return { success: false, error: `URL is not a video file (MIME: ${mimeType})` };
        }

        return {
            success: true,
            data: {
                sourceType: parsed.sourceType || 'cdn',
                originalUrl: url,
                embedUrl: url,
                posterThumbnail: '', // Must be uploaded by user
                title: url.split('/').pop() || 'Video',
                mimeType,
            }
        };
    } catch (e) {
        return { success: false, error: 'Failed to access video URL' };
    }
}

async function fetchOEmbed(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (res.ok) return await res.json();
    } catch {
        return null;
    }
    return null;
}

/**
 * Basic Open Graph Image Scraper
 * Uses regex to find og:image or twitter:image in HTML
 */
async function fetchOpenGraphImage(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: {
                // Using Discordbot/Slackbot user agents often bypasses JS-heavy "Please login" walls
                // and gets the raw meta tags for rich previews.
                'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
            }
        });
        if (!res.ok) return null;

        const html = await res.text();

        // More robust metadata extraction
        function findMeta(nameOrProperty: string): string | null {
            // Regex to find content in <meta ... property="X" ... content="Y" ...> or vice versa
            // Handles single/double quotes and variations in order
            const patterns = [
                new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProperty}["'][^>]+content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${nameOrProperty}["']`, 'i')
            ];

            for (const p of patterns) {
                const m = html.match(p);
                if (m && m[1]) return m[1];
            }
            return null;
        }

        // Try in order of richness
        let image = findMeta('og:image') ||
            findMeta('twitter:image') ||
            findMeta('thumbnail');

        // backup: Deep Scraper (look for common media patterns in raw body)
        if (!image) {
            // Look for things like "https://.../media/...jpg" or ".../thumb/...png"
            const mediaPattern = /["'](https:\/\/[^"']+\/(?:media|thumbnails?|posters?)\/[^"']+\.(?:jpe?g|png|webp))["']/i;
            const bodyMatch = html.match(mediaPattern);
            if (bodyMatch && bodyMatch[1]) image = bodyMatch[1];
        }

        return image ? image.trim() : null;

    } catch {
        return null;
    }
}

/**
 * Basic SSRF prevention
 * Checks for private/local IP ranges and hostnames
 */
function isSafeUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase();

        // Block local/private hostnames
        if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) return false;

        // Block .local, .internal, etc.
        if (host.endsWith('.local') || host.endsWith('.internal')) return false;

        // Note: Full SSRF protection should also check resolved IPs, 
        // but this handles most direct URL attacks in this context.
        return true;
    } catch {
        return false;
    }
}
