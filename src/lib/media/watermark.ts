/**
 * Image Watermarking Utility
 * Applies The Hint brand logo watermark to uploaded article images.
 *
 * RULES:
 * - Watermark is applied once during upload, before storage
 * - Logo loaded from filesystem (/public/brand/watermark-logo.png)
 * - Positioned bottom-right with proportional margins
 * - Watermark width = 15% of image width
 * - Logo background removed (transparent composite)
 * - Supports: JPG, PNG, WEBP
 * - Processes in <200ms target
 * - No double watermarking (only runs on fresh uploads)
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Watermark width as a fraction of image width */
const WATERMARK_SCALE = 0.15; // Increased to 15% for visibility as requested

/** Base margin in pixels (for a ~1200px wide image) */
const BASE_MARGIN = 32;

/** Reference width for base margin calculation */
const REFERENCE_WIDTH = 1200;

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
        } catch (error) {
            // Silently continue to next path
        }
    }

    console.warn('[MediaUpload] ⚠️ Watermark logo not found in any search path:', possiblePaths);
    console.warn('[MediaUpload] Context: process.cwd() =', process.cwd(), '| __dirname =', __dirname);
    return null; // Return null instead of throwing to avoid 400 Bad Request
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
 * Processing steps:
 * 1. Read uploaded image metadata (width/height)
 * 2. Calculate watermark size (15% of image width)
 * 3. Calculate proportional margin
 * 4. Resize watermark logo to target size with transparency
 * 5. Apply opacity reduction
 * 6. Composite watermark onto bottom-right of image
 * 7. Export in original format
 *
 * @param imageBuffer - The raw uploaded image buffer
 * @param mimeType - The MIME type of the uploaded image
 * @returns The watermarked image buffer
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
            console.warn('[MediaUpload] ⚠️ Skipping watermark application because logo was not found.');
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

        // Calculate watermark dimensions
        const watermarkWidth = Math.round(imageWidth * WATERMARK_SCALE);

        // Scale margin proportionally based on image size
        const marginScale = imageWidth / REFERENCE_WIDTH;
        const margin = Math.round(BASE_MARGIN * marginScale);

        console.info(`[MediaUpload] Step 3: Watermark width=${watermarkWidth}px, margin=${margin}px`);

        // Resize watermark logo to target width (maintaining aspect ratio)
        // No trimming - use the raw asset's bounds to ensure predictable behavior
        const resizedLogo = await sharp(logoBuffer)
            .resize({
                width: watermarkWidth,
                withoutEnlargement: true,
                fit: 'inside'
            })
            .ensureAlpha()
            .png()
            .toBuffer();

        const finalWatermark = resizedLogo;

        // Get the actual dimensions of the resized watermark
        const watermarkMeta = await sharp(finalWatermark).metadata();
        const wmWidth = watermarkMeta.width || watermarkWidth;
        const wmHeight = watermarkMeta.height || watermarkWidth;

        console.info(`[MediaUpload] Step 4: Watermark resized to ${wmWidth}x${wmHeight}`);

        // Calculate position offset from the bottom-right corner (closer to the edge)
        const layoutMargin = Math.round(imageWidth * 0.02);
        const left = Math.max(0, imageWidth - wmWidth - layoutMargin);
        const top = Math.max(0, imageHeight - wmHeight - layoutMargin);

        // Ensure position is valid (watermark fits within image)
        if (left < 0 || top < 0) {
            console.error('[MediaUpload] Image too small for watermark, skipping');
            return imageBuffer;
        }

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

        // ENFORCED: If watermarking is compulsory, we should throw if it fails 
        // to prevent non-watermarked images from leaking onto the site.
        throw new Error(`Watermarking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
