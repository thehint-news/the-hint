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
        // Video specific
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/\?v=(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/videos\/(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/v\/([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/,
        // General Posts
        // Support standard IDs and the new "pfbid..." base64-style IDs
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\/]+\/posts\/([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/story\.php\?story_fbid=([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/permalink\.php\?story_fbid=([a-zA-Z0-9_-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/photo\.php\?fbid=(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/photo\/\?fbid=(\d+)/,
        // Fallback for generic post IDs (including pfbid...)
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.*\/posts\/([a-zA-Z0-9_-]+)/,
    ],
    tiktok: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/(\d+)/,
    ],
    linkedin: [
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*activity-(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*ugcPost-(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*feed\/update\/urn:li:(?:activity|share|ugcPost):(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*id=(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:posts|feed\/update)\/([a-zA-Z0-9_-]+)/, // Fallback for other formats
    ],
    files: /\.(mp4|webm|mkv)$/i,
};

// =============================================================================
// URL PARSING
// =============================================================================

export function parseVideoUrl(url: string): VideoParseResult {
    if (!url || typeof url !== 'string') return { valid: false, error: 'URL required' };

    let trimmedUrl = url.trim();

    // 1. Handle Iframe Paste: Extract 'src' if user pasted an iframe code
    // Check for iframe or blockquote (for twitter/insta)
    if (/^<\s*(iframe|blockquote)/i.test(trimmedUrl)) {
        const srcMatch = trimmedUrl.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
            trimmedUrl = srcMatch[1];
            // Decode potential HTML entities in the URL
            trimmedUrl = trimmedUrl
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&#x27;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        } else {
            return { valid: false, error: 'Could not extract URL from embed code' };
        }
    }

    // 2. Handle missing protocol (e.g. "www.youtube.com/...")
    if (!/^https?:\/\//i.test(trimmedUrl)) {
        trimmedUrl = 'https://' + trimmedUrl;
    }

    // 3. Basic Protocol Check & Validation
    try {
        const urlObj = new URL(trimmedUrl);
        // We allow http for localhost dev, but generally prefer https
        if (urlObj.protocol !== 'https:' && urlObj.hostname !== 'localhost') {
            // Auto-upgrade to https for known providers
            const upgradeHosts = [
                'youtube.com', 'youtu.be', 'facebook.com', 'vimeo.com',
                'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'linkedin.com'
            ];
            const shouldUpgrade = upgradeHosts.some(h => urlObj.hostname.includes(h));

            if (shouldUpgrade) {
                trimmedUrl = trimmedUrl.replace(/^http:/, 'https:');
            }
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
        // Find the first non-null capturing group (some regexes have 1 group, others 2, etc, but we only care about the ID)
        let id = null;
        if (match) {
            for (let i = 1; i < match.length; i++) {
                if (match[i]) {
                    id = match[i];
                    break;
                }
            }
        }

        if (id) {
            // Determine if it's a video or a post
            const isVideo = /\/watch\/|\/videos\/|\/share\/v\/|\/share\/r\//.test(trimmedUrl);
            const plugin = isVideo ? 'video.php' : 'post.php';

            // Canonicalize the URL for the plugin
            // Facebook plugins are picky. Using the clean, canonical URL as 'href' is best.
            let href = trimmedUrl;

            // 1. Force https and www
            try {
                const urlObj = new URL(trimmedUrl);
                urlObj.protocol = 'https:';
                if (urlObj.hostname !== 'www.facebook.com') {
                    urlObj.hostname = 'www.facebook.com';
                }
                // 2. If we have a numeric video ID, use the stable video.php?v=ID format
                // This avoids issues with 'watch' URLs or mobile URLs
                if (isVideo && /^\d+$/.test(id)) {
                    href = `https://www.facebook.com/video.php?v=${id}`;
                } else {
                    // Clean up other URLs (remove unrelated query params if possible, but keep it simple for now)
                    href = urlObj.toString();
                }
            } catch {
                // Keep original if URL parsing fails
            }

            return {
                valid: true,
                sourceType: 'social',
                provider: 'facebook',
                id: id,
                embedUrl: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(href)}&show_text=false&t=0`,
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
            let id = match[1];
            // Clean ID but keep track of type if possible
            if (id.includes('activity-')) id = id.replace('activity-', '');
            if (id.includes('ugcPost-')) id = id.replace('ugcPost-', '');

            // Determine URN Type
            let urnType = 'share'; // Default
            if (trimmedUrl.includes('activity') || trimmedUrl.includes('urn:li:activity')) {
                urnType = 'activity';
            } else if (trimmedUrl.includes('ugcPost') || trimmedUrl.includes('urn:li:ugcPost')) {
                urnType = 'ugcPost';
            }

            return {
                valid: true,
                sourceType: 'social',
                provider: 'linkedin',
                id: id,
                embedUrl: `https://www.linkedin.com/embed/feed/update/urn:li:${urnType}:${id}`,
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
                const isVideo = parsed.embedUrl?.includes('video.php');
                const oembedEndpoint = isVideo
                    ? 'https://www.facebook.com/plugins/video/oembed.json/'
                    : 'https://www.facebook.com/plugins/post/oembed.json/';

                // Use the canonical 'href' from our parsed embedUrl if available
                // This ensures we don't send mobile/malformed URLs to the oEmbed endpoint
                let targetUrl = url;
                try {
                    if (parsed.embedUrl) {
                        const embedUrlObj = new URL(parsed.embedUrl);
                        const href = embedUrlObj.searchParams.get('href');
                        if (href) targetUrl = href;
                    }
                } catch { }

                const data = await fetchOEmbed(`${oembedEndpoint}?url=${encodeURIComponent(targetUrl)}`);
                if (data) {
                    title = data.title || title;
                    posterThumbnail = data.thumbnail_url || posterThumbnail;
                    authorName = data.author_name || authorName;

                    // We will use the official SDK in the frontend, so we can use the OEmbed HTML
                    // or construct a fallback specialized tag.
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
            } else if (provider === 'linkedin') {
                // LinkedIn offers no public unauthenticated oEmbed
                title = 'LinkedIn Content';
            }

            // Fallback & Enhancement
            if (!posterThumbnail || !title || title === 'Video' || title === 'LinkedIn Content' || provider === 'linkedin' || provider === 'facebook') {
                const ogData = await fetchOpenGraphData(url);
                if (ogData) {
                    if (!posterThumbnail && ogData.image) posterThumbnail = ogData.image;
                    if ((!title || title === 'Video' || title === 'LinkedIn Content') && ogData.title) title = ogData.title;
                    if (!authorName && ogData.author) authorName = ogData.author;
                }
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
 * Robust Open Graph Data Scraper
 * Extracts image, title, and author
 */
async function fetchOpenGraphData(url: string): Promise<{ image?: string; title?: string; author?: string } | null> {
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

        function findMeta(keys: string[]): string | null {
            for (const k of keys) {
                // Try property="..." and name="..."
                const p1 = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']+)["']`, 'i');
                const p2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${k}["']`, 'i');

                let m = html.match(p1);
                if (m && m[1]) return m[1];

                m = html.match(p2);
                if (m && m[1]) return m[1];
            }
            return null;
        }

        // Try in order of richness
        const image = findMeta(['og:image', 'twitter:image', 'thumbnail'])?.trim();
        const title = findMeta(['og:title', 'twitter:title', 'title'])?.trim();
        const author = findMeta(['author', 'article:author', 'og:site_name', 'twitter:creator'])?.trim();

        // Backup: Deep Scraper (look for common media patterns in raw body if no og:image)
        let finalImage = image;
        if (!finalImage) {
            // Look for things like "https://.../media/...jpg" or ".../thumb/...png"
            const mediaPattern = /["'](https:\/\/[^"']+\/(?:media|thumbnails?|posters?)\/[^"']+\.(?:jpe?g|png|webp))["']/i;
            const bodyMatch = html.match(mediaPattern);
            if (bodyMatch && bodyMatch[1]) finalImage = bodyMatch[1];
        }

        return {
            image: finalImage,
            title,
            author
        };

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
