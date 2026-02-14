/**
 * Media Upload Utilities
 * Server-side image upload processing via Supabase Storage.
 *
 * RULES:
 * - Images are NEVER stored in /public/media or the Git repo
 * - All images go to Supabase Storage
 * - Hash-based naming for deduplication
 * - Max 3 images enforced at validation layer
 * - Max 5MB per image enforced at storage layer
 * - Graceful failure: never crash
 * - No base64 in responses
 */

import { uploadToStorage, type StorageUploadResult } from './supabase-storage';
import { validateImageFile, type MediaValidationResult } from '../validation/media';

// =============================================================================
// TYPES
// =============================================================================

/** Result of image upload processing */
export interface ImageUploadResult {
    /** Whether upload succeeded */
    success: boolean;
    /** Uploaded image data (if success) */
    data?: {
        /** Unique asset ID (hash-based) */
        id: string;
        /** Public CDN URL */
        url: string;
        /** Responsive srcset string (single URL for now) */
        srcset: string;
        /** Image width */
        width: number;
        /** Image height */
        height: number;
        /** MIME type */
        mimeType: string;
        /** File size in bytes */
        size: number;
    };
    /** Error message (if failed) */
    error?: string;
    /** Validation errors */
    validationErrors?: MediaValidationResult['errors'];
}

// =============================================================================
// MAIN UPLOAD FUNCTION
// =============================================================================

/**
 * Process and upload an image to Supabase Storage.
 *
 * Validation flow:
 * 1. Validate file type + size
 * 2. Upload to Supabase Storage
 * 3. Return CDN URL + metadata
 *
 * No local filesystem writes at any point.
 */
export async function processImageUpload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    providedDimensions?: { width: number; height: number }
): Promise<ImageUploadResult> {
    // 1. Validate file
    const validation = validateImageFile({
        size: buffer.length,
        type: mimeType,
        name: filename,
    });

    if (!validation.isValid) {
        return {
            success: false,
            error: validation.errors[0]?.message || 'Invalid image file',
            validationErrors: validation.errors,
        };
    }

    try {
        // 2. Upload to Supabase Storage
        const result: StorageUploadResult = await uploadToStorage(
            buffer,
            mimeType,
            providedDimensions
        );

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.error || 'Upload to storage failed',
            };
        }

        // 3. Return CDN-backed response
        const { id, url, width, height, size } = result.data;

        return {
            success: true,
            data: {
                id,
                url,
                srcset: `${url} ${width}w`,
                width,
                height,
                mimeType,
                size,
            },
        };
    } catch (error) {
        console.error('[UPLOAD] Image processing error:', error);
        return {
            success: false,
            error: 'Failed to process image. Please try again.',
        };
    }
}

// =============================================================================
// RE-EXPORTS for backward compatibility
// =============================================================================

export { generateImageHash, extractDimensions as getImageDimensions } from './supabase-storage';
