/**
 * Image Watermarking Utility
 * Applies The Hint brand logo watermark to uploaded article images.
 *
 * REFINED FOR NEW LOGO:
 * - Automatically trims transparent whitespace from logo for precision
 * - Proportional scaling (15% of image width)
 * - Corner margins (3% of image width)
 * - High-quality Lanczos resampling
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Watermark width as a fraction of image width (Reduced for subtle appearance) */
const WATERMARK_SCALE = 0.08;

/** Minimum watermark width in pixels (clamped for mobile visibility) */
const MIN_WATERMARK_PX = 32;

/** Margin as a fraction of image width (Reduced for balance) */
const MARGIN_SCALE = 0.02;

/** Minimum margin in pixels */
const MIN_MARGIN_PX = 8;

// =============================================================================
// LOGO CACHE
// =============================================================================

/** Cached trimmed logo buffer */
let cachedTrimmedLogo: Buffer | null = null;

/**
 * Load and pre-process the watermark logo.
 * Trims transparent edges once and caches the result for performance.
 */
async function getProcessedLogo(): Promise<Buffer | null> {
    if (cachedTrimmedLogo) return cachedTrimmedLogo;

    const possiblePaths = [
        join(process.cwd(), 'public', 'brand', 'watermark-logo.png'),
        join(process.cwd(), '.next', 'server', 'public', 'brand', 'watermark-logo.png'),
        join(process.cwd(), 'brand', 'watermark-logo.png'),
        '/var/task/public/brand/watermark-logo.png',
        '/var/task/.next/server/public/brand/watermark-logo.png',
    ];

    let rawBuffer: Buffer | null = null;

    for (const logoPath of possiblePaths) {
        try {
            rawBuffer = readFileSync(logoPath);
            if (rawBuffer && rawBuffer.length > 0) {
                console.info(`[MediaUpload] Watermark source loaded: ${logoPath}`);
                break;
            }
        } catch { /* continue */ }
    }

    if (!rawBuffer) {
        console.warn('[MediaUpload] ⚠️ Watermark logo not found in paths:', possiblePaths);
        return null;
    }

    try {
        // Pre-process: Trim transparent padding so scaling/margins apply to visible content
        cachedTrimmedLogo = await sharp(rawBuffer)
            .trim()
            .toBuffer();
        
        console.info('[MediaUpload] Watermark pre-processed (trimmed and cached)');
        return cachedTrimmedLogo;
    } catch (err) {
        console.error('[MediaUpload] ❌ Failed to pre-process watermark logo:', err);
        return rawBuffer; // Fallback to untrimmed
    }
}

/**
 * Get the output format configuration for sharp based on MIME type.
 */
function getOutputFormat(mimeType: string): {
    format: keyof sharp.FormatEnum;
    options: sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions;
} {
    switch (mimeType) {
        case 'image/jpeg':
            return { format: 'jpeg', options: { quality: 90, mozjpeg: true } };
        case 'image/png':
            return { format: 'png', options: { compressionLevel: 9 } };
        case 'image/webp':
            return { format: 'webp', options: { quality: 85 } };
        default:
            return { format: 'jpeg', options: { quality: 90 } };
    }
}

/**
 * Apply The Hint logo watermark to an image buffer.
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
        const logoBuffer = await getProcessedLogo();
        if (!logoBuffer) return imageBuffer;

        const metadata = await sharp(imageBuffer).metadata();
        if (!metadata.width || !metadata.height) return imageBuffer;

        const imageWidth = metadata.width;
        const imageHeight = metadata.height;

        // 1. Calculate dimensions
        // Use 15% of width, but ensure it's not too small
        const targetWatermarkWidth = Math.max(
            MIN_WATERMARK_PX,
            Math.round(imageWidth * WATERMARK_SCALE)
        );

        // 2. Calculate margin
        const margin = Math.max(
            MIN_MARGIN_PX,
            Math.round(imageWidth * MARGIN_SCALE)
        );

        // 3. Resize logo (trimmed) to target width
        const resizedLogoBuffer = await sharp(logoBuffer)
            .resize({
                width: targetWatermarkWidth,
                withoutEnlargement: false, // Allow scaling up for very high-res images
                kernel: 'lanczos3',        // High quality
            })
            .ensureAlpha()
            .png()
            .toBuffer();

        const wmMeta = await sharp(resizedLogoBuffer).metadata();
        const wmWidth = wmMeta.width || targetWatermarkWidth;
        const wmHeight = wmMeta.height || targetWatermarkWidth;

        // 4. Safety Check: If the watermark is still too large for the image, scale it down further
        let finalWatermark = resizedLogoBuffer;
        let finalWmWidth = wmWidth;
        let finalWmHeight = wmHeight;

        const maxAllowedWidth = imageWidth - margin * 2;
        const maxAllowedHeight = imageHeight - margin * 2;

        if (wmWidth > maxAllowedWidth || wmHeight > maxAllowedHeight) {
            finalWatermark = await sharp(resizedLogoBuffer)
                .resize({
                    width: Math.max(1, maxAllowedWidth),
                    height: Math.max(1, maxAllowedHeight),
                    fit: 'inside'
                })
                .toBuffer();
            
            const finalMeta = await sharp(finalWatermark).metadata();
            finalWmWidth = finalMeta.width || finalWmWidth;
            finalWmHeight = finalMeta.height || finalWmHeight;
        }

        // 5. Position: Bottom-Right
        const left = Math.round(imageWidth - finalWmWidth - margin);
        const top = Math.round(imageHeight - finalWmHeight - margin);

        // 6. Composite
        const { format, options } = getOutputFormat(mimeType);
        
        const result = await sharp(imageBuffer)
            .composite([{
                input: finalWatermark,
                left,
                top,
                blend: 'over'
            }])
            .toFormat(format, options)
            .toBuffer();

        const elapsed = Date.now() - startTime;
        console.info(`[MediaUpload] ✅ Watermarked: ${imageWidth}x${imageHeight} in ${elapsed}ms`);
        
        return result;

    } catch (err) {
        console.error('[MediaUpload] ❌ Watermark failed:', err);
        return imageBuffer;
    }
}


