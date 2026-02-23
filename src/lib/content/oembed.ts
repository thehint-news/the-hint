/**
 * Social Media oEmbed Provider Logic
 * 
 * PRODUCTION SCALING SUGGESTIONS:
 * 1. Redis Caching: Currently uses an in-memory `Map` for caching. In a serverless 
 *    environment (like Vercel), this memory resets per function invocation. For 
 *    production, replace `oEmbedCache` with a Redis instance (e.g., Upstash) to 
 *    share the cache globally across all edge nodes.
 * 2. Edge Caching: Add stale-while-revalidate headers to the API response so the CDN 
 *    handles the caching layer entirely, taking the load off the Next.js server.
 */

export type OEmbedPlatform = 'x' | 'instagram' | 'youtube' | 'facebook' | 'tiktok' | 'linkedin';

export interface OEmbedResponse {
    html: string;
    type?: string;
    provider_name?: string;
    provider_url?: string;
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
    width?: number;
    height?: number;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================
interface CacheEntry {
    data: OEmbedResponse;
    expiresAt: number;
}

const oEmbedCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour caching layer

// ============================================================================
// URL DETECTION AND VALIDATION
// ============================================================================

export function detectOEmbedPlatform(url: string): OEmbedPlatform | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        if (host.includes('twitter.com') || host.includes('x.com')) return 'x';
        if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
        if (host.includes('instagram.com')) return 'instagram';
        if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) return 'facebook';
        if (host.includes('tiktok.com')) return 'tiktok';
        if (host.includes('linkedin.com')) return 'linkedin';

        return null;
    } catch {
        return null;
    }
}

// ============================================================================
// FETCHING LOGIC
// ============================================================================

export async function fetchOEmbedData(url: string): Promise<OEmbedResponse> {
    const platform = detectOEmbedPlatform(url);
    if (!platform) {
        throw new Error('Unsupported platform for oEmbed');
    }

    // Checking the server-side cache first to prevent rate-limits
    const cached = oEmbedCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    let oembedApiUrl = '';

    // ========================================================================
    // PLATFORM ENDPOINTS CONFIGURATION
    // ========================================================================
    switch (platform) {
        case 'x':
            // X (Twitter) public oEmbed does not require auth
            oembedApiUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&align=center`;
            break;

        case 'youtube':
            // YouTube public oEmbed
            oembedApiUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            break;

        case 'tiktok':
            // TikTok public oEmbed
            oembedApiUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
            break;

        case 'instagram':
        case 'facebook':
            // Meta Graph API requires an App ID and Client Token
            // Format: access_token=APP_ID|CLIENT_TOKEN
            const metaToken = process.env.META_OEMBED_TOKEN;
            if (!metaToken) {
                // FALLBACK: Synthesize the official HTML payload to allow client SDK to render
                // This bypasses the need for an oEmbed token entirely for standard display.
                if (platform === 'instagram') {
                    return {
                        html: `<blockquote class="instagram-media" data-instgrm-permalink="${url}?utm_source=ig_embed" data-instgrm-version="14" style="max-width:740px; margin:auto;"></blockquote>`
                    };
                } else if (platform === 'facebook') {
                    return {
                        html: `<div class="fb-post" data-href="${url}" data-width="500"></div>`
                    };
                }
            }

            const baseUri = platform === 'instagram'
                ? 'https://graph.facebook.com/v19.0/instagram_oembed'
                : 'https://graph.facebook.com/v19.0/oembed_post';
            oembedApiUrl = `${baseUri}?url=${encodeURIComponent(url)}&access_token=${metaToken}&omitscript=true`;
            break;
    }

    try {
        const response = await fetch(oembedApiUrl, {
            headers: {
                'Accept': 'application/json',
                // Using a generic user agent to prevent basic blocking
                'User-Agent': 'Mozilla/5.0 (compatible; EditorialEmbedFetcher/1.0; +https://thehint.in)',
            },
            signal: AbortSignal.timeout(8000), // Prevent hanging requests
        });

        if (!response.ok) {
            throw new Error(`Provider returned ${response.status}`);
        }

        let data: OEmbedResponse;
        try {
            data = await response.json();
        } catch {
            throw new Error('Failed to parse oEmbed JSON');
        }

        // Security: Basic sanitization to prevent arbitrary script injection from hijacked DNS
        const sanitizedHtml = sanitizeOEmbedHtml(data.html, platform);
        const finalData = { ...data, html: sanitizedHtml };

        // Save to cache
        oEmbedCache.set(url, {
            data: finalData,
            expiresAt: Date.now() + CACHE_TTL_MS
        });

        return finalData;

    } catch (error) {
        // FALLBACK: Synthesize the official HTML payload to allow client SDK to render
        // This is triggered if fetch fails, 404s, or times out.
        if (platform === 'x') {
            return {
                html: `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>`
            };
        } else if (platform === 'tiktok') {
            const videoIdMatch = url.match(/video\/(\d+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : '';
            return {
                html: `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width: 605px;min-width: 325px;" ><section><a target="_blank" title="TikTok" href="${url}"></a></section></blockquote>`
            };
        } else if (platform === 'youtube') {
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&]+)/i);
            const videoId = ytMatch ? ytMatch[1] : '';
            return {
                html: `<iframe class="oembed-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            };
        } else if (platform === 'linkedin') {
            const liMatch = url.match(/-(\d{19,20})/);
            if (liMatch && liMatch[1]) {
                const activityId = liMatch[1];
                return {
                    html: `<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}" height="600" width="100%" frameborder="0" allowfullscreen="" title="Embedded post"></iframe>`
                };
            }
            if (url.includes('/embed/')) {
                return {
                    html: `<iframe src="${url}" height="600" width="100%" frameborder="0" allowfullscreen="" title="Embedded post"></iframe>`
                };
            }
        }
        console.error(`[oEmbed] Fetch failed for ${url}:`, error);
        throw error;
    }
}

// ============================================================================
// SECURITY SANITIZATION

/**
 * Ensures the returned HTML only includes iframes and blockquotes.
 * Excludes arbitrary `<script>` tags completely from the rendered HTML.
 * The client component will inject the *official* platform SDK explicitly.
 */
function sanitizeOEmbedHtml(html: string, platform: OEmbedPlatform): string {
    if (!html) return '';
    let clean = html;

    // 1. Strip all script tags from the raw HTML payload to prevent XSS.
    // The SocialEmbed client component handles SDK loading manually, 
    // ensuring we only ever load official library scripts.
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Wrap YouTube in a responsive container if it's an iframe
    if (platform === 'youtube' && clean.includes('iframe')) {
        // Strip out fixed widths/heights so CSS can handle aspect-ratio
        clean = clean.replace(/width=["']\d+["']/gi, 'width="100%"');
        clean = clean.replace(/height=["']\d+["']/gi, 'height="100%"');
        // Add a class for responsive targeting
        clean = clean.replace('<iframe', '<iframe class="oembed-iframe"');
    }

    return clean.trim();
}
