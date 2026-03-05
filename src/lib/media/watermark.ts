/**
 * Image Watermarking Utility
 * Applies The Hint brand logo watermark to uploaded article images.
 *
 * RULES:
 * - Watermark is applied once during upload, before storage
 * - Logo loaded from filesystem (/public/brand/watermark-logo.png)
 * - Positioned bottom-right with proportional margins
 * - Watermark width = 15% of image width (min 24px for tiny images)
 * - Logo background removed (transparent composite)
 * - Supports: JPG, PNG, WEBP, AVIF
 * - Processes in <200ms target
 * - No double watermarking (only runs on fresh uploads)
 * - ANY image size is accepted — no size restrictions
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Watermark width as a fraction of image width */
const WATERMARK_SCALE = 0.15;

/** Minimum watermark width in pixels (for very small images) */
const MIN_WATERMARK_PX = 24;

/** Margin as a fraction of image width */
const MARGIN_SCALE = 0.02;

/** Minimum margin in pixels */
const MIN_MARGIN_PX = 4;

// =============================================================================
// WATERMARK LOGO CACHE
// =============================================================================

/**
 * Cached watermark logo buffer (already converted to PNG with alpha).
 * Loaded once from filesystem and reused across all requests.
 */
let cachedLogoBuffer: Buffer | null = null;

/**
 * Load the watermark logo from the filesystem.
 * Uses a singleton cache to avoid repeated disk reads.
 */
function loadWatermarkLogo(): Buffer | null {
    if (cachedLogoBuffer) {
        return cachedLogoBuffer;
    }

    // Try multiple paths to accommodate different deployment environments (Vercel, Local, Docker)
    const possiblePaths = [
        join(process.cwd(), 'public', 'brand', 'watermark-logo.png'),
        join(process.cwd(), '.next', 'server', 'public', 'brand', 'watermark-logo.png'),
        join(process.cwd(), 'brand', 'watermark-logo.png'),
        // Vercel / Cloudflare absolute paths
        '/var/task/public/brand/watermark-logo.png',
        '/var/task/.next/server/public/brand/watermark-logo.png',
    ];

    for (const logoPath of possiblePaths) {
        try {
            const buffer = readFileSync(logoPath);
            if (buffer && buffer.length > 0) {
                cachedLogoBuffer = buffer;
                console.info('[MediaUpload] Watermark logo loaded successfully from:', logoPath);
                return cachedLogoBuffer;
            }
        } catch {
            // Silently continue to next path
        }
    }

    console.warn('[MediaUpload] ⚠️ Watermark logo not found in any search path:', possiblePaths);
    console.warn('[MediaUpload] Context: process.cwd() =', process.cwd(), '| __dirname =', __dirname);
    return null;
}

// =============================================================================
// WATERMARK APPLICATION
// =============================================================================

/**
 * Get the output format configuration for sharp based on MIME type.
 */
function getOutputFormat(mimeType: string): {
    format: keyof sharp.FormatEnum;
    options: sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions;
} {
    switch (mimeType) {
        case 'image/jpeg':
            return { format: 'jpeg', options: { quality: 90 } };
        case 'image/png':
            return { format: 'png', options: { compressionLevel: 6 } };
        case 'image/webp':
            return { format: 'webp', options: { quality: 90 } };
        default:
            return { format: 'jpeg', options: { quality: 90 } };
    }
}

/**
 * Apply The Hint logo watermark to an image buffer.
 *
 * Works with ANY image size — no restrictions. For very small images the
 * watermark is scaled down proportionally and clamped to fit. For very large
 * images the watermark scales up to remain visible.
 *
 * Processing steps:
 * 1. Read uploaded image metadata (width/height)
 * 2. Calculate watermark size (15% of image width, min 24px)
 * 3. Resize watermark logo to target size (allows enlargement)
 * 4. Clamp watermark to fit within image bounds
 * 5. Calculate bottom-right position with proportional margin
 * 6. Composite watermark onto image
 * 7. Export in original format
 *
 * @param imageBuffer - The raw uploaded image buffer
 * @param mimeType - The MIME type of the uploaded image
 * @returns The watermarked image buffer (or original on graceful failure)
 */
export async function applyWatermark(
    imageBuffer: Buffer,
    mimeType: string
): Promise<Buffer> {
    const startTime = Date.now();

    try {
        // Load the watermark logo (cached after first load or null if not found)
        const logoBuffer = loadWatermarkLogo();

        if (!logoBuffer) {
            console.warn('[MediaUpload] ⚠️ Skipping watermark — logo not found.');
            return imageBuffer;
        }

        console.info('[MediaUpload] Step 1: Logo loaded');

        // Get uploaded image metadata
        const metadata = await sharp(imageBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            console.error('[MediaUpload] Could not read image dimensions, skipping watermark');
            return imageBuffer;
        }

        const imageWidth = metadata.width;
        const imageHeight = metadata.height;
        console.info(`[MediaUpload] Step 2: Image is ${imageWidth}x${imageHeight}`);

        // Calculate target watermark width — 15% of image width, min 24px
        const rawWatermarkWidth = Math.round(imageWidth * WATERMARK_SCALE);
        const targetWatermarkWidth = Math.max(MIN_WATERMARK_PX, rawWatermarkWidth);

        // Calculate margin — 2% of image width, min 4px
        const margin = Math.max(MIN_MARGIN_PX, Math.round(imageWidth * MARGIN_SCALE));

        console.info(`[MediaUpload] Step 3: Target watermark width=${targetWatermarkWidth}px, margin=${margin}px`);

        // Resize watermark logo to target width (maintaining aspect ratio)
        // withoutEnlargement is FALSE — we allow scaling up for large images
        const resizedLogo = await sharp(logoBuffer)
            .resize({
                width: targetWatermarkWidth,
                withoutEnlargement: false,
                fit: 'inside',
            })
            .ensureAlpha()
            .png()
            .toBuffer();

        // Get the actual dimensions of the resized watermark
        const watermarkMeta = await sharp(resizedLogo).metadata();
        let wmWidth = watermarkMeta.width || targetWatermarkWidth;
        let wmHeight = watermarkMeta.height || targetWatermarkWidth;

        console.info(`[MediaUpload] Step 4: Watermark resized to ${wmWidth}x${wmHeight}`);

        // Safety clamp: if the watermark is larger than the image (very tiny
        // uploaded images), shrink it to fit within the image with margin
        const maxWmWidth = Math.max(1, imageWidth - margin * 2);
        const maxWmHeight = Math.max(1, imageHeight - margin * 2);

        let finalWatermark = resizedLogo;

        if (wmWidth > maxWmWidth || wmHeight > maxWmHeight) {
            console.info(`[MediaUpload] Step 4b: Clamping watermark to fit within ${maxWmWidth}x${maxWmHeight}`);
            finalWatermark = await sharp(resizedLogo)
                .resize({
                    width: maxWmWidth,
                    height: maxWmHeight,
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .ensureAlpha()
                .png()
                .toBuffer();

            const clampedMeta = await sharp(finalWatermark).metadata();
            wmWidth = clampedMeta.width || maxWmWidth;
            wmHeight = clampedMeta.height || maxWmHeight;
            console.info(`[MediaUpload] Step 4c: Clamped watermark to ${wmWidth}x${wmHeight}`);
        }

        // Calculate position: bottom-right corner with margin
        // Clamp to 0 so we never get negative coordinates
        const left = Math.max(0, imageWidth - wmWidth - margin);
        const top = Math.max(0, imageHeight - wmHeight - margin);

        console.info(`[MediaUpload] Step 5: Position left=${left}, top=${top}`);

        // Composite watermark onto the image
        const { format, options } = getOutputFormat(mimeType);

        const watermarkedBuffer = await sharp(imageBuffer)
            .composite([{
                input: finalWatermark,
                left,
                top,
                blend: 'over',
            }])
            .toFormat(format, options)
            .toBuffer();

        const elapsed = Date.now() - startTime;

        // Verify the buffer actually changed
        const sizeChanged = watermarkedBuffer.length !== imageBuffer.length;
        console.info(
            `[MediaUpload] ✅ Watermark applied in ${elapsed}ms | ` +
            `Image: ${imageWidth}x${imageHeight} | ` +
            `Input: ${imageBuffer.length} bytes → Output: ${watermarkedBuffer.length} bytes | ` +
            `Size changed: ${sizeChanged}`
        );

        return watermarkedBuffer;

    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[MediaUpload] ❌ Watermark FAILED after ${elapsed}ms:`, error);

        // Graceful fallback: return the original image so the upload doesn't fail.
        // The image will be uploaded without a watermark, which is better than
        // blocking the user from adding content entirely.
        console.warn('[MediaUpload] ⚠️ Returning original image without watermark due to processing error.');
        return imageBuffer;
    }
}

