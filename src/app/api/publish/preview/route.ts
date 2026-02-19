/**
 * Preview API Route
 * POST /api/publish/preview
 * 
 * Generates an ephemeral preview of the article.
 * - Uses SAME rendering pipeline as live article page
 * - NO persistence (no file write)
 * - NO slug reservation
 * - Returns rendered HTML or structured preview data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    sanitizeString,
    sanitizeStringArray,
    normalizeTags,
    isValidSection,
    isValidContentType,
    ContentType,
} from '@/lib/validation';
import { Section } from '@/lib/content/types';
import { verifyAuth } from '@/lib/auth/session';

/**
 * Preview data structure
 */
interface PreviewData {
    headline: string;
    subheadline: string;
    section: Section;
    contentType: ContentType;
    body: string;
    tags: string[];
    sources: string[];
    featured: boolean;
    previewDate: string;
}

/**
 * POST - Generate ephemeral preview
 * No validation errors - just sanitize and return
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce strict session
        try {
            await verifyAuth();
        } catch (error: any) {
            if (error.message === 'Unauthorized' || error.message === 'Session expired') {
                return NextResponse.json(
                    { success: false, error: 'Session expired.' },
                    { status: 401 }
                );
            }
            throw error;
        }

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON in request body',
                    errors: [{ field: 'body', message: 'Request body must be valid JSON' }]
                },
                { status: 400 }
            );
        }

        // Ensure body is an object
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Request body must be an object',
                    errors: [{ field: 'body', message: 'Request body must be a JSON object' }]
                },
                { status: 400 }
            );
        }


        const input = body as Record<string, unknown>;

        // Sanitize inputs for preview (no strict validation)
        const headline = sanitizeString(input.headline) || 'Untitled Preview';
        const subheadline = sanitizeString(input.subheadline) || '';
        const bodyContent = sanitizeString(input.body) || 'No content';
        const section = isValidSection(input.section) ? input.section : 'politics';
        const contentType = isValidContentType(input.contentType) ? input.contentType : 'news';
        const tags = normalizeTags(input.tags);
        const sources = sanitizeStringArray(input.sources);
        const featured = input.featured === true;

        const previewData: PreviewData = {
            headline,
            subheadline,
            section,
            contentType,
            body: bodyContent,
            tags,
            sources,
            featured,
            previewDate: new Date().toISOString(),
        };

        // Return preview data for client-side rendering
        // The client will use the same article component to render
        return NextResponse.json(
            {
                success: true,
                message: 'Preview generated',
                data: {
                    preview: previewData,
                    // Include the URL this would have if published
                    wouldBeUrl: `/${section}/${generatePreviewSlug(headline)}`,
                },
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Unexpected error in preview API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'An unexpected error occurred',
                errors: [{ field: 'unknown', message: 'Internal server error' }],
            },
            { status: 500 }
        );
    }
}

/**
 * Generate a preview slug (just for display, not reserved)
 */
function generatePreviewSlug(headline: string): string {
    return headline
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'preview';
}

/**
 * Reject other HTTP methods
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json(
        { success: false, error: 'Method not allowed. Use POST to generate preview.' },
        { status: 405 }
    );
}

export async function PUT(): Promise<NextResponse> {
    return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
    );
}

export async function DELETE(): Promise<NextResponse> {
    return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
    );
}

export async function PATCH(): Promise<NextResponse> {
    return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
    );
}
