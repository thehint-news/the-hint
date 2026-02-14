/**
 * Media Upload Utilities (Git-Backed)
 * Server-side image upload processing and storage
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * Features:
 * - Image validation (format, size)
 * - Hash-based naming for deduplication
 * - Storage in /public/media/images/ via Git commits
 * - NO local filesystem persistence
 */

import { createHash } from 'crypto';
import { gitService, createGitStaging } from '../git/service';
import {
    MediaAsset,
    ImageDimensions,
} from '../content/media-types';
import { validateImageFile, MediaValidationResult } from '../validation/media';

// =============================================================================
// TYPES
// =============================================================================

/** Result of image upload processing */
export interface ImageUploadResult {
    /** Whether upload succeeded */
    success: boolean;
    /** Uploaded image data (if success) */
    data?: {
        /** Unique asset ID */
        id: string;
        /** Primary image URL */
        url: string;
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
    };
    /** Error message (if failed) */
    error?: string;
    /** Validation errors */
    validationErrors?: MediaValidationResult['errors'];
}

/** Responsive size configuration */
interface ResponsiveSize {
    name: string;
    width: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Base directory for media storage (relative to repo root) */
const MEDIA_BASE_DIR = 'public/media';
const IMAGES_DIR = 'images';

/** Responsive sizes to generate (config only - resizing requires sharp which we avoid for simplicity in this pass) */
const RESPONSIVE_SIZES: ResponsiveSize[] = [
    { name: '400w', width: 400 },
    { name: '800w', width: 800 },
    { name: '1200w', width: 1200 },
];

/** URL prefix for served images */
const MEDIA_URL_PREFIX = '/media/images';

// =============================================================================
// HASH GENERATION
// =============================================================================

/**
 * Generate a hash-based ID for an image
 * Uses first 16 characters of SHA-256 hash
 */
export function generateImageHash(buffer: Buffer): string {
    const hash = createHash('sha256').update(buffer).digest('hex');
    return hash.substring(0, 16);
}

// =============================================================================
// IMAGE PROCESSING (BASIC)
// =============================================================================

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(
    buffer: Buffer,
    mimeType: string
): Promise<ImageDimensions | undefined> {
    try {
        if (mimeType === 'image/png') {
            if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);
                return { width, height };
            }
        }

        if (mimeType === 'image/jpeg') {
            let offset = 2;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xFF) break;
                const marker = buffer[offset + 1];
                if (marker === 0xC0 || marker === 0xC2) {
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    return { width, height };
                }
                const length = buffer.readUInt16BE(offset + 2);
                offset += 2 + length;
            }
        }
        return undefined;
    } catch (error) {
        console.error('Error extracting image dimensions:', error);
        return undefined;
    }
}

/**
 * Get file extension for MIME type
 */
function getExtensionForMimeType(mimeType: string): string {
    switch (mimeType) {
        case 'image/jpeg': return '.jpg';
        case 'image/png': return '.png';
        case 'image/webp': return '.webp';
        case 'image/avif': return '.avif';
        default: return '.jpg';
    }
}

// =============================================================================
// MAIN UPLOAD FUNCTION
// =============================================================================

/**
 * Process and store an uploaded image using GitService
 */
export async function processImageUpload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    providedDimensions?: ImageDimensions
): Promise<ImageUploadResult> {
    // Validate file
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
        // Generate hash-based ID
        const hash = generateImageHash(buffer);

        // Get dimensions
        let dimensions = providedDimensions || await getImageDimensions(buffer, mimeType) || { width: 1200, height: 800 };

        // Determine file extension
        const ext = getExtensionForMimeType(mimeType);

        // Save original file to Git
        const originalFilename = `${hash}-original${ext}`;
        const relativePath = `${MEDIA_BASE_DIR}/${IMAGES_DIR}/${originalFilename}`;

        const staging = createGitStaging();
        // Stage original
        await gitService.writeFileAtomic(relativePath, buffer, staging);

        const filesToCommit = [relativePath];
        const originalUrl = `${MEDIA_URL_PREFIX}/${originalFilename}`;

        const srcsetParts: string[] = [];
        let bestResponsiveUrl: string | null = null;

        for (const size of RESPONSIVE_SIZES) {
            if (size.width <= dimensions.width) {
                const sizeFilename = `${hash}-${size.name}${ext}`;
                const sizePath = `${MEDIA_BASE_DIR}/${IMAGES_DIR}/${sizeFilename}`;

                // Stage "resized" (copied) file
                await gitService.writeFileAtomic(sizePath, buffer, staging);
                filesToCommit.push(sizePath);

                const url = `${MEDIA_URL_PREFIX}/${sizeFilename}`;
                srcsetParts.push(`${url} ${size.width}w`);

                // If this is the 800w size, mark as primary
                if (size.width === 800) {
                    bestResponsiveUrl = url;
                }
            }
        }

        // Always include original as fallback in srcset
        srcsetParts.push(`${originalUrl} ${dimensions.width}w`);

        // Commit all media files
        await gitService.commitFiles(filesToCommit, `Media: upload ${filename} (${hash})`, staging);

        const primaryUrl = bestResponsiveUrl || originalUrl;
        const srcset = srcsetParts.join(', ');

        return {
            success: true,
            data: {
                id: hash,
                url: primaryUrl,
                srcset,
                width: dimensions.width,
                height: dimensions.height,
                mimeType,
                size: buffer.length,
            },
        };
    } catch (error) {
        console.error('Image upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process image',
        };
    }
}

// =============================================================================
// ASSET REGISTRY (Git-Backed)
// =============================================================================

const REGISTRY_PATH = `${MEDIA_BASE_DIR}/registry.json`;

/**
 * Load media registry from Git
 */
export async function loadMediaRegistry(): Promise<MediaAsset[]> {
    try {
        const data = await gitService.readFile(REGISTRY_PATH);
        if (!data) return [];
        return JSON.parse(data);
    } catch {
        return [];
    }
}

/**
 * Save media registry to Git
 */
export async function saveMediaRegistry(assets: MediaAsset[]): Promise<void> {
    await gitService.saveFile(REGISTRY_PATH, JSON.stringify(assets, null, 2), 'Media: update registry');
}

/**
 * Add asset to registry
 */
export async function registerMediaAsset(
    asset: Omit<MediaAsset, 'usedBy'>
): Promise<void> {
    const registry = await loadMediaRegistry();
    if (registry.find(a => a.id === asset.id)) return;

    registry.push({ ...asset, usedBy: [] });
    await saveMediaRegistry(registry);
}

/**
 * Update asset usage
 */
export async function updateAssetUsage(
    assetId: string,
    articleSlug: string,
    action: 'add' | 'remove'
): Promise<void> {
    const registry = await loadMediaRegistry();
    const asset = registry.find(a => a.id === assetId);

    if (!asset) return;

    if (action === 'add') {
        if (!asset.usedBy.includes(articleSlug)) {
            asset.usedBy.push(articleSlug);
        }
    } else {
        asset.usedBy = asset.usedBy.filter(s => s !== articleSlug);
    }

    await saveMediaRegistry(registry);
}

/**
 * Get orphaned assets
 */
export async function getOrphanedAssets(): Promise<MediaAsset[]> {
    const registry = await loadMediaRegistry();
    return registry.filter(a => a.usedBy.length === 0);
}
