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
 * - Generates canonical variants (Editorial 4:3 and Social 1.91:1)
 * - Atomic: if variant generation/upload fails, returns clean error
 */

import { uploadVariantsToStorage, type StorageVariantsUploadResult } from './supabase-storage';
import { validateImageFile, type MediaValidationResult } from '../validation/media';
import { processImageVariants } from './image-processor';

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
        /** Canonical editorial thumbnail URL (4:3) */
        url: string;
        /** Explicit thumbnail URL (4:3, 1200x900) */
        thumbnailUrl: string;
        /** Explicit social / Open Graph image URL (1.91:1, 1200x630) */
        socialImageUrl: string;
        /** Original source image URL */
        originalUrl: string;
        /** Responsive srcset string */
        srcset: string;
        /** Image width */
        width: number;
        /** Image height */
        height: number;
        /** MIME type */
        mimeType: string;
        /** File size in bytes */
        size: number;
        /** Canonical variants */
        variants: {
            original: { url: string; width: number; height: number; size: number; mimeType: string };
            thumbnail: { url: string; width: number; height: number; size: number; mimeType: string };
            social: { url: string; width: number; height: number; size: number; mimeType: string };
        };
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
 * Process and upload an image to Supabase Storage with canonical variants.
 *
 * Flow:
 * 1. Validate file size and MIME format
 * 2. Process into canonical variants (4:3 thumbnail, 1.91:1 OG image, original)
 * 3. Upload all variants atomically to Supabase Storage
 * 4. Return CDN URLs for all variants
 */
export async function processImageUpload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    _providedDimensions?: { width: number; height: number },
    shouldWatermark: boolean = false
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
        // 2. Decode bytes and generate canonical variants
        const variants = await processImageVariants(buffer, mimeType, {
            shouldWatermark,
        });

        // 3. Upload all variants atomically to Supabase Storage
        const uploadResult: StorageVariantsUploadResult = await uploadVariantsToStorage(variants);

        if (!uploadResult.success || !uploadResult.data) {
            return {
                success: false,
                error: uploadResult.error || 'Failed to upload image variants to storage.',
            };
        }

        const { id, url, thumbnailUrl, socialImageUrl, originalUrl, width, height, size } = uploadResult.data;

        return {
            success: true,
            data: {
                id,
                url,
                thumbnailUrl,
                socialImageUrl,
                originalUrl,
                srcset: `${url} 1200w`,
                width,
                height,
                mimeType: 'image/jpeg',
                size,
                variants: {
                    original: uploadResult.data.variants.original,
                    thumbnail: uploadResult.data.variants.thumbnail,
                    social: uploadResult.data.variants.social,
                },
            },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown image processing error';
        console.error('[UPLOAD] Image processing error:', message);
        return {
            success: false,
            error: 'Image processing failed. Please upload another image.',
        };
    }
}

// =============================================================================
// RE-EXPORTS for backward compatibility
// =============================================================================

export { generateImageHash, extractDimensions as getImageDimensions } from './supabase-storage';
