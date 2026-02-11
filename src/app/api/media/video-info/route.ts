/**
 * Video Info API Route
 * POST /api/media/video-info
 * 
 * Validates video URLs and fetches metadata via oEmbed.
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * Security:
 * - Requires authenticated session (via middleware)
 * - Rate limiting deferred to infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getVideoInfo, parseVideoUrl } from '@/lib/media/video-providers';
import { VideoSourceType, SocialVideoProvider } from '@/lib/content/media-types';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

interface VideoInfoSuccessResponse {
    success: true;
    data: {
        sourceType: VideoSourceType;
        provider?: SocialVideoProvider;
        originalUrl: string;
        embedUrl?: string;
        posterThumbnail: string;
        title: string;
        duration?: number;
        authorName?: string;
        mimeType?: string;
    };
}

interface VideoInfoErrorResponse {
    success: false;
    error: string;
}

type VideoInfoResponse = VideoInfoSuccessResponse | VideoInfoErrorResponse;

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<VideoInfoResponse>> {
    // Verify authentication
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // Parse request body
        const body = await request.json();
        const { url } = body as { url?: string };

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Video URL is required' },
                { status: 400 }
            );
        }

        // Quick validation first
        const parsed = parseVideoUrl(url);
        if (!parsed.valid) {
            return NextResponse.json(
                { success: false, error: parsed.error || 'Invalid video URL' },
                { status: 400 }
            );
        }

        // Fetch full video info (includes oEmbed)
        const result = await getVideoInfo(url);

        if (!result.success || !result.data) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to fetch video info' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.data,
        });

    } catch (error) {
        console.error('Video info error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// =============================================================================
// OPTIONS HANDLER (CORS)
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Allow': 'POST, OPTIONS',
        },
    });
}
