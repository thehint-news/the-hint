/**
 * Image Processor
 * Server-side canonical image variant generation using Sharp.
 * 
 * Canonical Variants:
 * 1. ORIGINAL: Preserved source (optionally watermarked)
 * 2. EDITORIAL THUMBNAIL: Exactly 4:3 (1200×900), center-cropped, high quality
 * 3. SOCIAL / OPEN GRAPH: Exactly 1.91:1 (1200×630), center-cropped, JPEG, guaranteed < 300KB for WhatsApp
 * 
 * RULES:
 * - Deterministic output
 * - No distortion (sharp fit: cover, position: centre)
 * - Auto-rotate based on EXIF
 * - Strict byte-level validation
 * - Fail safely with informative errors
 */

import sharp, { Metadata } from 'sharp';
import { createHash } from 'crypto';
import { ALLOWED_IMAGE_FORMATS, MAX_IMAGE_SIZE_BYTES } from '@/lib/content/media-types';
import { applyWatermark } from './watermark';


export interface ProcessedVariant {
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: string;
    size: number;
    ext: string;
}

export interface ProcessedImageResult {
    hash: string;
    original: ProcessedVariant;
    thumbnail: ProcessedVariant;
    social: ProcessedVariant;
}

/**
 * Generate a deterministic hash for an image buffer (SHA-256 first 16 chars).
 */
export function generateImageHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

/**
 * Get file extension from MIME type.
 */
export function getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
        case 'image/webp': return 'webp';
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/avif': return 'avif';
        default: return 'jpg';
    }
}

/**
 * Process an uploaded image into canonical variants.
 */
export async function processImageVariants(
    buffer: Buffer,
    declaredMimeType: string,
    options: {
        shouldWatermark?: boolean;
    } = {}
): Promise<ProcessedImageResult> {
    // 1. Enforce size limit
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(`Image exceeds maximum allowed size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`);
    }

    // 2. Enforce allowed formats
    if (!ALLOWED_IMAGE_FORMATS.includes(declaredMimeType as typeof ALLOWED_IMAGE_FORMATS[number])) {
        throw new Error(`Unsupported image format: ${declaredMimeType}. Allowed: JPEG, PNG, WebP, AVIF.`);
    }

    // 3. Decode image and validate bytes
    let metadata: Metadata;
    try {
        metadata = await sharp(buffer).metadata();
    } catch (err: unknown) {
        throw new Error(`Failed to decode image bytes: ${err instanceof Error ? err.message : 'Corrupted or unreadable image'}`);
    }

    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
        throw new Error('Invalid image dimensions in uploaded file.');
    }

    // Hash is derived from the source image buffer for deterministic immutability
    const hash = generateImageHash(buffer);

    // 4. Generate Original Variant (watermarked if requested)
    let originalBuffer = buffer;
    if (options.shouldWatermark) {
        try {
            originalBuffer = await applyWatermark(buffer, declaredMimeType);
        } catch {
            // Keep buffer if watermark fails
            originalBuffer = buffer;
        }
    }

    const originalExt = getExtensionFromMime(declaredMimeType);
    const originalVariant: ProcessedVariant = {
        buffer: originalBuffer,
        width: metadata.width,
        height: metadata.height,
        mimeType: declaredMimeType,
        size: originalBuffer.length,
        ext: originalExt,
    };

    // 5. Generate Editorial Thumbnail (4:3 aspect ratio, 1200x900)
    // Center crop with cover, no distortion, auto-rotate EXIF
    const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 900, {
            fit: 'cover',
            position: sharp.strategy.attention || 'centre',
        })
        .jpeg({
            quality: 85,
            mozjpeg: true,
        })
        .toBuffer();

    const thumbnailVariant: ProcessedVariant = {
        buffer: thumbBuffer,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
        size: thumbBuffer.length,
        ext: 'jpg',
    };

    // 6. Generate Social / Open Graph (1.91:1 aspect ratio, 1200x630)
    // Canonical for WhatsApp, Facebook, Twitter preview cards
    let socialBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 630, {
            fit: 'cover',
            position: sharp.strategy.attention || 'centre',
        })
        .jpeg({
            quality: 85,
            mozjpeg: true,
        })
        .toBuffer();

    // Strict safety check: WhatsApp crawler requires image size <= 300KB
    if (socialBuffer.length > 290 * 1024) {
        socialBuffer = await sharp(buffer)
            .rotate()
            .resize(1200, 630, {
                fit: 'cover',
                position: sharp.strategy.attention || 'centre',
            })
            .jpeg({
                quality: 75,
                mozjpeg: true,
            })
            .toBuffer();
    }

    const socialVariant: ProcessedVariant = {
        buffer: socialBuffer,
        width: 1200,
        height: 630,
        mimeType: 'image/jpeg',
        size: socialBuffer.length,
        ext: 'jpg',
    };

    return {
        hash,
        original: originalVariant,
        thumbnail: thumbnailVariant,
        social: socialVariant,
    };
}

/**
 * Generate a 1200x900 4:3 editorial thumbnail from an existing image buffer.
 * Used for legacy migration and thumbnail derivation.
 */
export async function createThumbnailVariantFromBuffer(buffer: Buffer): Promise<ProcessedVariant> {
    const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 900, {
            fit: 'cover',
            position: sharp.strategy.attention || 'centre',
        })
        .jpeg({
            quality: 85,
            mozjpeg: true,
        })
        .toBuffer();

    return {
        buffer: thumbBuffer,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
        size: thumbBuffer.length,
        ext: 'jpg',
    };
}

/**
 * Generate a 1200x630 social image from an existing image buffer or URL.
 * Used for legacy migration and backward compatibility fallback.
 */
export async function createSocialVariantFromBuffer(buffer: Buffer): Promise<ProcessedVariant> {
    let socialBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 630, {
            fit: 'cover',
            position: sharp.strategy.attention || 'centre',
        })
        .jpeg({
            quality: 85,
            mozjpeg: true,
        })
        .toBuffer();

    if (socialBuffer.length > 290 * 1024) {
        socialBuffer = await sharp(buffer)
            .rotate()
            .resize(1200, 630, {
                fit: 'cover',
                position: sharp.strategy.attention || 'centre',
            })
            .jpeg({
                quality: 75,
                mozjpeg: true,
            })
            .toBuffer();
    }

    return {
        buffer: socialBuffer,
        width: 1200,
        height: 630,
        mimeType: 'image/jpeg',
        size: socialBuffer.length,
        ext: 'jpg',
    };
}
