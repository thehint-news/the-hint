import { NextRequest, NextResponse } from 'next/server';
import { fetchOEmbedData, detectOEmbedPlatform } from '@/lib/content/oembed';

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
    try {
        const url = request.nextUrl.searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { error: 'Missing URL parameter' },
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
