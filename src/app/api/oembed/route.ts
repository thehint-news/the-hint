import { NextRequest, NextResponse } from 'next/server';
import { fetchOEmbedData, detectOEmbedPlatform } from '@/lib/content/oembed';
import { checkRateLimit } from '@/lib/rate-limit';
import * as dns from 'dns';

const ALLOWED_PLATFORMS = [
    'youtube.com', 'youtu.be', 'twitter.com', 'x.com',
    'instagram.com', 'facebook.com', 'vimeo.com'
];

async function isSafeUrl(urlString: string): Promise<boolean> {
    try {
        const url = new URL(urlString);
        const host = url.hostname.toLowerCase();

        let allowed = false;
        for (const p of ALLOWED_PLATFORMS) {
            if (host === p || host.endsWith('.' + p)) {
                allowed = true;
                break;
            }
        }
        if (!allowed) {
            return false;
        }

        const addresses = await dns.promises.lookup(host, { all: true });
        for (const addr of addresses) {
            const ip = addr.address;
            if (
                ip === 'localhost' ||
                ip.startsWith('127.') ||
                ip.startsWith('169.254.') ||
                ip.startsWith('10.') ||
                ip.startsWith('192.168.') ||
                ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
            ) {
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * GET /api/oembed
 * 
 * Fetches and caches official oEmbed HTML for social platforms.
 * 
 * Query Params:
 * - url (required): The canonical URL of the social post
 * 
 * Example:
 * /api/oembed?url=https://x.com/username/status/123
 */
export async function GET(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { error: 'Missing URL parameter' },
                { status: 400 }
            );
        }

        const safe = await isSafeUrl(url);
        if (!safe) {
            return NextResponse.json(
                { error: 'Unsupported or unsafe URL domain' },
                { status: 400 }
            );
        }

        const platform = detectOEmbedPlatform(url);
        if (!platform) {
            return NextResponse.json(
                { error: 'Unsupported URL platform for oEmbed' },
                { status: 400 }
            );
        }

        const data = await fetchOEmbedData(url);

        // Security & Caching Headers
        // Set stale-while-revalidate to let CDN cache the payload
        // while revalidating in the background after 1 hour.
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
            // Prevent embedding this JSON endpoint in iframes
            'X-Frame-Options': 'DENY',
        });

        return new NextResponse(JSON.stringify(data), {
            status: 200,
            headers,
        });

    } catch (error: unknown) {
        console.error('[API oEmbed] Error:', error);

        // Fallback for Meta Graph API requirement or server error
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch oEmbed data' },
            { status: 500 }
        );
    }
}
