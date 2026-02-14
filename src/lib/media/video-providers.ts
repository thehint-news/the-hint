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
        isRestricted?: boolean; // Flag for fallback-only rendering
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
        // Explicit Video/Reel paths only
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:watch\/\?v=|video\.php\?v=|videos\/|share\/v\/|share\/r\/|reel\/)([a-zA-Z0-9._-]+)/,
        /(?:https?:\/\/)?fb\.watch\/([a-zA-Z0-9._-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/videos\/([a-zA-Z0-9._-]+)/,
        // Posts and Permalinks (General social content)
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/(?:posts|permalink|photos)\/([a-zA-Z0-9._-]+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/permalink\.php\?story_fbid=([a-zA-Z0-9._-]+)/,
    ],
    tiktok: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/(\d+)/,
        /(?:https?:\/\/)?v[mt]\.tiktok\.com\/([a-zA-Z0-9_-]+)/, // Mobile share links
    ],
    linkedin: [
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*activity-(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*ugcPost-(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*feed\/update\/urn:li:(?:activity|share|ugcPost):(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/.*id=(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:posts|feed\/update)\/([a-zA-Z0-9_-]+)/, // Fallback for other formats
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/video\/live\/urn:li:ugcPost:(\d+)/,
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
            // Blockquote fallback for Twitter/Instagram
            const hrefMatch = trimmedUrl.match(/href=["']([^"']+)["']/i);
            if (hrefMatch && hrefMatch[1]) {
                trimmedUrl = hrefMatch[1];
            } else {
                return { valid: false, error: 'Could not extract URL from embed code' };
            }
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
                'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'fb.watch'
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
            const isVideo = /(?:watch\/|videos\/|share\/v\/|share\/r\/|fb\.watch\/|reel\/)/.test(trimmedUrl);
            const plugin = isVideo ? 'video.php' : 'post.php';

            // Canonicalize the URL for the plugin
            // Facebook plugins are picky. Using the clean, canonical URL as 'href' is best.
            let href = trimmedUrl;

            // 1. Force https and www
            try {
                const urlObj = new URL(trimmedUrl);
                urlObj.protocol = 'https:';
                // Handle fb.watch (redirects normally, but we can canonicalize)
                if (urlObj.hostname === 'fb.watch') {
                    // Keep it, oembed will follow it
                } else if (urlObj.hostname !== 'www.facebook.com') {
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
        // Find the group with the ID (usually the last one)
        let id = null;
        if (match) {
            id = match[match.length - 1];
        }

        if (id) {
            return {
                valid: true,
                sourceType: 'social',
                provider: 'tiktok',
                id: id,
                embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
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
            } else if (trimmedUrl.includes('ugcPost') || trimmedUrl.includes('urn:li:ugcPost') || trimmedUrl.includes('video/live')) {
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

/**
 * In-memory cache to prevent hammering external APIs
 * and improve UX when users retry or navigate.
 */
const metadataCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCachedMetadata<T>(key: string): T | null {
    const cached = metadataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
    }
    return null;
}

function setCachedMetadata(key: string, data: any) {
    // Keep cache size manageable
    if (metadataCache.size > 100) {
        const firstKey = metadataCache.keys().next().value;
        if (firstKey) metadataCache.delete(firstKey);
    }
    metadataCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Robust fetch with automatic retries and site-aware User-Agents.
 * Handles platform blocking and flaky APIs.
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, backoff = 800): Promise<Response | null> {
    const siteBots: Record<string, string> = {
        'twitter.com': 'Twitterbot/1.0',
        'x.com': 'Twitterbot/1.0',
        'facebook.com': 'facebookexternalhit/1.1',
        'fb.watch': 'facebookexternalhit/1.1',
        'instagram.com': 'facebookexternalhit/1.1',
        'linkedin.com': 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient)',
        'tiktok.com': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
        'youtube.com': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    };

    let domain = '';
    try {
        domain = new URL(url).hostname.replace('www.', '');
    } catch { }

    const userAgents = [
        siteBots[domain] || 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'facebookexternalhit/1.1',
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
    ];

    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout per try (slightly longer for social)

            const res = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': userAgents[i % userAgents.length],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    ...options.headers,
                },
                signal: controller.signal,
                redirect: 'follow'
            });
            clearTimeout(timeout);

            if (res.ok) {
                // If we got redirected to a login/auth page, it's a fail
                const finalUrl = res.url.toLowerCase();
                if (finalUrl.includes('/login') || finalUrl.includes('/auth') || finalUrl.includes('/signup')) {
                    continue; // Try next UA
                }
                return res;
            }

            // If rate limited, wait longer before retry
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, backoff * 4 * (i + 1)));
            }
        } catch (e) {
            // Network error or timeout
        }

        if (i < retries) {
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
    return null;
}

export async function getVideoInfo(url: string): Promise<VideoInfoResult> {
    // 0. Check Cache First
    const cached = getCachedMetadata<any>(`info:${url}`);
    if (cached) return { success: true, data: cached };

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
                // Instagram OEmbed requires App Access Token. Fallback to scraping immediately if unauthenticated.
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

                let targetUrl = url;
                try {
                    if (parsed.embedUrl) {
                        const embedUrlObj = new URL(parsed.embedUrl);
                        const href = embedUrlObj.searchParams.get('href');
                        if (href) targetUrl = href;
                    }
                } catch { }

                // Facebook OEmbed also requires tokens.
                const data = await fetchOEmbed(`${oembedEndpoint}?url=${encodeURIComponent(targetUrl)}`);
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
                } else if (parsed.id) {
                    // Fallback to manual blockquote for Twitter Widget SDK
                    trustedSourceHtml = `<blockquote class="twitter-tweet"><a href="https://twitter.com/x/status/${parsed.id}"></a></blockquote>`;
                }
            } else if (provider === 'linkedin') {
                title = 'LinkedIn Content';
            }

            // Fallback & Enhancement Scraper (Always runs if data missing or placeholder)
            if (!posterThumbnail || !title || title === 'Video' || title === 'LinkedIn Content' || !authorName) {
                const ogData = await fetchOpenGraphData(url);
                if (ogData) {
                    if (!posterThumbnail && ogData.image) posterThumbnail = ogData.image;
                    if ((!title || title === 'Video' || title === 'LinkedIn Content') && ogData.title) title = ogData.title;
                    if (!authorName && ogData.author) authorName = ogData.author;
                }
            }

            // Instagram Manual Fallback (if scrape succeeded but oEmbed failed)
            if (provider === 'instagram' && !trustedSourceHtml && parsed.id) {
                trustedSourceHtml = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/${parsed.id}/" data-instgrm-version="14"></blockquote>`;
            }

        } catch (e) {
            console.error('[VIDEO-PROVIDERS] Metadata fetch failed:', e);
        }

        // D. Determine Fallback Requirement
        // Platforms that often fail or restrict external embeds
        const conditionalProviders = ['facebook', 'instagram', 'x', 'twitter', 'tiktok', 'linkedin'];
        let isRestricted = conditionalProviders.includes(provider);

        // If oEmbed succeeded with HTML, we might be able to use it, 
        // but the user's policy says Facebook/Restricted should favor Link Previews
        // if they are at risk of 'Video Unavailable'
        if (provider === 'facebook' || (isRestricted && !trustedSourceHtml)) {
            isRestricted = true;
        }

        // YouTube/Vimeo are never "Restricted" in this sense (they handle their own errors in facade)
        if (provider === 'youtube' || provider === 'vimeo') {
            isRestricted = false;
        }

        const resultData = {
            sourceType: 'social' as const,
            provider: provider,
            originalUrl: url,
            embedUrl: parsed.embedUrl,
            posterThumbnail,
            title,
            duration,
            authorName,
            trustedSourceHtml,
            isRestricted,
        };

        setCachedMetadata(`info:${url}`, resultData);
        return { success: true, data: resultData };
    }

    // SSRF Check
    if (!isSafeUrl(url)) {
        return { success: false, error: 'Access to local or private networks is restricted' };
    }

    try {
        const res = await fetchWithRetry(url, { method: 'HEAD' });
        if (!res || !res.ok) {
            return { success: false, error: `Inaccessible URL` };
        }

        const mimeType = res.headers.get('content-type');
        if (!mimeType || !mimeType.startsWith('video/')) {
            return { success: false, error: `URL is not a video file (MIME: ${mimeType})` };
        }

        const fileResult = {
            sourceType: parsed.sourceType || 'cdn',
            originalUrl: url,
            embedUrl: url,
            posterThumbnail: '',
            title: url.split('/').pop() || 'Video',
            mimeType,
            isRestricted: false,
        };

        setCachedMetadata(`info:${url}`, fileResult);
        return { success: true, data: fileResult as any };
    } catch (e) {
        return { success: false, error: 'Failed to access video URL' };
    }
}

async function fetchOEmbed(url: string) {
    const cached = getCachedMetadata<any>(`oembed:${url}`);
    if (cached) return cached;

    try {
        const res = await fetchWithRetry(url);
        if (res && res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                setCachedMetadata(`oembed:${url}`, data);
                return data;
            }
        }
    } catch (e) {
        // Quietly fail as we have fallbacks
    }
    return null;
}

/**
 * Robust Open Graph & JSON-LD Scraper
 * Extracts image, title, and author with multiple fallbacks
 */
async function fetchOpenGraphData(url: string): Promise<{ image?: string; title?: string; author?: string } | null> {
    const cached = getCachedMetadata<any>(`og:${url}`);
    if (cached) return cached;

    try {
        const res = await fetchWithRetry(url);
        if (!res || !res.ok) return null;

        const html = await res.text();
        const base = new URL(url);

        function cleanUrl(u: string): string {
            try {
                return new URL(u, base.origin + base.pathname).toString();
            } catch {
                return u;
            }
        }

        function findMeta(keys: string[]): string | null {
            for (const k of keys) {
                // Try multiple patterns to handle varied attribute ordering and separators
                const patterns = [
                    // Property/Name first
                    new RegExp(`<meta[^>]*?(?:property|name|itemprop)=["']${k}["'][^>]*?content=["']([^"']+)["']`, 'i'),
                    // Content first
                    new RegExp(`<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name|itemprop)=["']${k}["']`, 'i'),
                ];

                for (const p of patterns) {
                    const m = html.match(p);
                    if (m && m[1]) {
                        // Decode common HTML entities
                        return m[1]
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');
                    }
                }
            }
            return null;
        }

        // 1. Try JSON-LD first (most structured)
        let ldImage, ldTitle, ldAuthor;
        try {
            const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            for (const match of ldMatches) {
                try {
                    const data = JSON.parse(match[1]);
                    const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
                    for (const item of items) {
                        if (!ldTitle) ldTitle = item.name || item.headline;
                        if (!ldAuthor) ldAuthor = item.author?.name || item.author?.[0]?.name || item.publisher?.name || item.brand?.name;
                        if (!ldImage) {
                            const imgObj = item.image || item.thumbnailUrl;
                            ldImage = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.[0]);
                        }
                    }
                } catch { }
            }
        } catch { }

        // 2. Try Meta Tags with expanded list
        const ogImage = findMeta(['og:image', 'og:image:secure_url', 'og:image:url', 'twitter:image', 'twitter:image:src', 'thumbnail', 'image']);
        const ogTitle = findMeta(['og:title', 'twitter:title', 'title', 'headline', 'h1']);
        const ogAuthor = findMeta(['author', 'article:author', 'og:site_name', 'og:publisher', 'article:publisher', 'twitter:creator', 'twitter:site']);

        // 3. Final Selection
        const finalTitle = ldTitle || ogTitle || html.match(/<title>([^<]+)<\/title>/i)?.[1];
        const finalImage = ldImage || ogImage || findMeta(['link[rel="image_src"]']); // Check for old rel=image_src

        // If image still not found, try to find the first large-ish image in the doc (simple heuristic)
        // But for now let's stick to meta/json-ld to keep it fast and clean.

        const finalAuthor = ldAuthor || ogAuthor;

        const result = {
            image: finalImage ? cleanUrl(finalImage) : undefined,
            title: finalTitle?.trim(),
            author: finalAuthor?.trim()
        };

        setCachedMetadata(`og:${url}`, result);
        return result;

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
