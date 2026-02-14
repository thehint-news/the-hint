/**
 * Media Upload API Route
 * POST /api/media/upload
 * 
 * Handles image file uploads to Cloudflare R2 storage.
 * No local filesystem writes. No images in repository.
 * 
 * Security:
 * - Requires authenticated session (via middleware)
 * - Validates file type and size server-side
 * - Max 5MB, max 3 images per article
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { processImageUpload } from '@/lib/media/upload';
import { ALLOWED_IMAGE_FORMATS, MAX_IMAGE_SIZE_BYTES } from '@/lib/content/media-types';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

interface UploadSuccessResponse {
    success: true;
    data: {
        id: string;
        url: string;
        srcset: string;
        width: number;
        height: number;
        mimeType: string;
        size: number;
    };
}

interface UploadErrorResponse {
    success: false;
    error: string;
    details?: { field: string; message: string }[];
}

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
    // Verify authentication
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_IMAGE_FORMATS.includes(file.type as typeof ALLOWED_IMAGE_FORMATS[number])) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid file type: ${file.type}`,
                    details: [{
                        field: 'file',
                        message: `Allowed formats: JPEG, PNG, WebP, AVIF`
                    }]
                },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            const maxMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
            return NextResponse.json(
                {
                    success: false,
                    error: `File too large`,
                    details: [{
                        field: 'file',
                        message: `Maximum file size is ${maxMB}MB`
                    }]
                },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get dimensions from form data if provided
        const widthStr = formData.get('width');
        const heightStr = formData.get('height');
        let providedDimensions: { width: number; height: number } | undefined;

        if (widthStr && heightStr) {
            const width = parseInt(String(widthStr), 10);
            const height = parseInt(String(heightStr), 10);
            if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                providedDimensions = { width, height };
            }
        }

        // Process upload
        const result = await processImageUpload(
            buffer,
            file.name,
            file.type,
            providedDimensions
        );

        if (!result.success) {
            console.error('[UPLOAD ROUTE] Upload failed:', result.error, result.validationErrors);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || 'Upload failed',
                    details: result.validationErrors?.map(e => ({
                        field: 'file',
                        message: e.message,
                    }))
                },
                { status: 400 }
            );
        }

        // Return success
        return NextResponse.json({
            success: true,
            data: result.data!,
        });

    } catch (error) {
        console.error('Media upload error:', error);
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
