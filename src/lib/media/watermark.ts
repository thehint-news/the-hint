/**
 * Image Watermarking Utility
 * Applies The Hint brand logo watermark to uploaded article images.
 *
 * RULES:
 * - Watermark is applied once during upload, before storage
 * - Logo loaded from filesystem (/public/brand/watermark-logo.png)
 * - Positioned bottom-right with proportional margins
 * - Watermark width = 15% of image width
 * - Opacity: 0.6
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
const WATERMARK_SCALE = 0.15;

/** Watermark opacity (0-1). Lower = more transparent */
const WATERMARK_OPACITY = 0.6;

/** Base margin in pixels (for a ~1200px wide image) */
const BASE_MARGIN = 24;

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
function loadWatermarkLogo(): Buffer {
    if (cachedLogoBuffer) {
        return cachedLogoBuffer;
    }

    // In Next.js, process.cwd() points to the project root
    const logoPath = join(process.cwd(), 'public', 'brand', 'watermark-logo.png');

    try {
        cachedLogoBuffer = readFileSync(logoPath);
        // Use console.info — preserved in production builds
        console.info('[MediaUpload] Watermark logo loaded:', logoPath, `(${cachedLogoBuffer.length} bytes)`);
        return cachedLogoBuffer;
    } catch (error) {
        console.error('[MediaUpload] FATAL: Watermark logo not found at:', logoPath, error);
        throw new Error(`Watermark logo not found at ${logoPath}`);
    }
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
        // Load the watermark logo (cached after first load)
        const logoBuffer = loadWatermarkLogo();
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
        // Convert to PNG with alpha channel for clean compositing
        const resizedLogo = await sharp(logoBuffer)
            .resize({ width: watermarkWidth, fit: 'inside' })
            .ensureAlpha()
            .png()
            .toBuffer();

        // Apply opacity by modifying the alpha channel using dest-in blend
        // This multiplies every pixel's alpha by WATERMARK_OPACITY
        const opacityByte = Math.round(255 * WATERMARK_OPACITY);
        const watermarkWithOpacity = await sharp(resizedLogo)
            .composite([{
                input: Buffer.from([255, 255, 255, opacityByte]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in',
            }])
            .png()
            .toBuffer();

        // Get the actual dimensions of the resized watermark
        const watermarkMeta = await sharp(watermarkWithOpacity).metadata();
        const wmWidth = watermarkMeta.width || watermarkWidth;
        const wmHeight = watermarkMeta.height || watermarkWidth;

        console.info(`[MediaUpload] Step 4: Watermark resized to ${wmWidth}x${wmHeight}`);

        // Calculate position (bottom-right with margin)
        const left = imageWidth - wmWidth - margin;
        const top = imageHeight - wmHeight - margin;

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
                input: watermarkWithOpacity,
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

        // Graceful degradation: return original image if watermarking fails
        // This ensures upload never breaks due to watermark issues
        return imageBuffer;
    }
}
