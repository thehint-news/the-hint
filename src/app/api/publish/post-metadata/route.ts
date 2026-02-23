/**
 * Post Metadata API Route
 * POST /api/publish/post-metadata
 * 
 * Server-side endpoint for fetching social post metadata.
 * Called by the Post Block Editor when a URL or embed HTML is submitted.
 * 
 * SECURITY:
 * - Requires authentication
 * - Validates domain whitelist
 * - Sanitizes all returned content
 * - No client-side metadata fetching allowed
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { detectPlatform, extractCanonicalUrl, isAllowedDomain, sanitizeText } from '@/lib/content/post-utils';
import { fetchPostMetadata } from '@/lib/content/post-metadata';

/**
 * POST - Fetch metadata for a social post URL
 * 
 * Body: { url?: string, embedHtml?: string }
 * Returns: { platform, canonicalUrl, metadata }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce authentication
        try {
            await verifyAuth();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session expired. Please log in again.' },
                { status: 401 }
            );
        }

        // Parse request body
        let body: { url?: string; embedHtml?: string };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid request format.' },
                { status: 400 }
            );
        }

        const { url, embedHtml } = body;

        // Must provide either URL or embed HTML
        if (!url && !embedHtml) {
            return NextResponse.json(
                { success: false, error: 'Provide either a URL or embed HTML.' },
                { status: 400 }
            );
        }

        // Determine input
        const input = url || embedHtml || '';

        // Detect platform
        const platform = detectPlatform(input);
        if (!platform) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unsupported platform. Supported: X, Facebook, Instagram, YouTube, LinkedIn, TikTok.',
                },
                { status: 400 }
            );
        }

        // Extract and validate canonical URL
        const canonicalUrl = extractCanonicalUrl(input);
        if (!canonicalUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Could not extract a valid URL. Ensure the URL is from a supported platform.',
                },
                { status: 400 }
            );
        }

        // Final domain check
        if (!isAllowedDomain(canonicalUrl)) {
            return NextResponse.json(
                { success: false, error: 'URL domain is not allowed.' },
                { status: 400 }
            );
        }

        // Fetch metadata (server-side only)
        const metadata = await fetchPostMetadata(canonicalUrl, platform);

        // Sanitize all string fields one more time
        const sanitizedMetadata = {
            author: sanitizeText(metadata.author),
            username: sanitizeText(metadata.username),
            avatar: metadata.avatar,
            textPreview: sanitizeText(metadata.textPreview),
            thumbnail: metadata.thumbnail,
            timestamp: metadata.timestamp,
            verified: metadata.verified,
        };

        return NextResponse.json(
            {
                success: true,
                data: {
                    platform,
                    canonicalUrl,
                    originalUrl: url || canonicalUrl,
                    metadata: sanitizedMetadata,
                },
            },
            {
                status: 200,
                headers: {
                    // Cache for 5 minutes (metadata is snapshot anyway)
                    'Cache-Control': 'private, max-age=300',
                },
            }
        );
    } catch (error) {
        console.error('[PostMetadata API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch post metadata. Please try again.' },
            { status: 500 }
        );
    }
}

/** Reject other methods */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json(
        { success: false, error: 'Method not allowed. Use POST.' },
        { status: 405 }
    );
}
