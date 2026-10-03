/**
 * Supabase Storage — Media Upload
 *
 * Uploads images to Supabase Storage (free tier, no credit card).
 * Returns public CDN URLs. No local filesystem writes.
 *
 * Canonical Storage paths:
 * - Original:  articles/{year}/{month}/{hash}-original.{ext}
 * - Thumbnail: articles/{year}/{month}/{hash}-thumb-4x3.jpg (1200x900)
 * - Social OG: articles/{year}/{month}/{hash}-og-1200x630.jpg (1200x630)
 *
 * RULES:
 * - No images in /public/media or in the repository
 * - All images served from Supabase Storage CDN
 * - Max 5MB per image enforced
 * - Graceful failure: never crash on upload error
 * - Atomic variant uploads: all succeed or rollback
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { ProcessedImageResult, createSocialVariantFromBuffer } from './image-processor';

// =============================================================================
// CONFIGURATION
// =============================================================================

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'article-images';

    if (!url || (!anonKey && !serviceRoleKey)) {
        return null;
    }

    return { url, anonKey, serviceRoleKey, bucket };
}

// Server-side client uses service role key to bypass RLS
let _serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient | null {
    if (_serverClient) return _serverClient;

    const config = getSupabaseConfig();
    if (!config) return null;

    const key = config.serviceRoleKey || config.anonKey;
    if (!key) return null;

    _serverClient = createClient(config.url, key);
    return _serverClient;
}

// =============================================================================
// TYPES
// =============================================================================

export interface StorageUploadResult {
    success: boolean;
    data?: {
        /** Unique hash-based ID */
        id: string;
        /** Public CDN URL */
        url: string;
        /** Storage path (key) */
        key: string;
        /** Image width */
        width: number;
        /** Image height */
        height: number;
        /** MIME type */
        mimeType: string;
        /** File size in bytes */
        size: number;
    };
    error?: string;
}

export interface StorageVariantsUploadResult {
    success: boolean;
    data?: {
        id: string;
        /** Primary editorial URL (4:3 thumbnail 1200x900) */
        url: string;
        thumbnailUrl: string;
        socialImageUrl: string;
        originalUrl: string;
        thumbnailKey: string;
        socialKey: string;
        originalKey: string;
        width: number;
        height: number;
        mimeType: string;
        size: number;
        variants: {
            original: { url: string; key: string; width: number; height: number; size: number; mimeType: string };
            thumbnail: { url: string; key: string; width: number; height: number; size: number; mimeType: string };
            social: { url: string; key: string; width: number; height: number; size: number; mimeType: string };
        };
    };
    error?: string;
}

// =============================================================================
// HASH + PATH GENERATION
// =============================================================================

/**
 * Generate a deterministic hash for an image buffer.
 * Uses first 16 chars of SHA-256 for uniqueness + deduplication.
 */
export function generateImageHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

/**
 * Get file extension from MIME type.
 */
function getExtension(mimeType: string): string {
    switch (mimeType) {
        case 'image/webp': return 'webp';
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/avif': return 'avif';
        default: return 'jpg';
    }
}

/**
 * Generate legacy single-image storage path.
 * Pattern: articles/{year}/{month}/{hash}.{ext}
 */
function generateStoragePath(hash: string, mimeType: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = getExtension(mimeType);
    return `articles/${year}/${month}/${hash}.${ext}`;
}

/**
 * Generate canonical variant paths for an image.
 */
export function generateCanonicalPaths(hash: string, originalExt: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `articles/${year}/${month}/${hash}`;
    return {
        original: `${prefix}-original.${originalExt}`,
        thumbnail: `${prefix}-thumb-4x3.jpg`,
        social: `${prefix}-og-1200x630.jpg`,
    };
}

// =============================================================================
// IMAGE DIMENSION EXTRACTION (FALLBACK)
// =============================================================================

export function extractDimensions(
    buffer: Buffer,
    mimeType: string
): { width: number; height: number } {
    try {
        if (mimeType === 'image/png' && buffer.length > 24) {
            if (buffer.toString('ascii', 1, 4) === 'PNG') {
                return {
                    width: buffer.readUInt32BE(16),
                    height: buffer.readUInt32BE(20),
                };
            }
        }

        if (mimeType === 'image/jpeg') {
            let offset = 2;
            while (offset < buffer.length - 9) {
                if (buffer[offset] !== 0xFF) break;
                const marker = buffer[offset + 1];
                if (marker === 0xC0 || marker === 0xC2) {
                    return {
                        width: buffer.readUInt16BE(offset + 7),
                        height: buffer.readUInt16BE(offset + 5),
                    };
                }
                const segmentLength = buffer.readUInt16BE(offset + 2);
                offset += 2 + segmentLength;
            }
        }

        if (mimeType === 'image/webp' && buffer.length > 30) {
            const riff = buffer.toString('ascii', 0, 4);
            const webp = buffer.toString('ascii', 8, 12);
            if (riff === 'RIFF' && webp === 'WEBP') {
                const chunkType = buffer.toString('ascii', 12, 16);
                if (chunkType === 'VP8 ' && buffer.length > 29) {
                    return {
                        width: buffer.readUInt16LE(26) & 0x3FFF,
                        height: buffer.readUInt16LE(28) & 0x3FFF,
                    };
                }
                if (chunkType === 'VP8L' && buffer.length > 25) {
                    const bits = buffer.readUInt32LE(21);
                    return {
                        width: (bits & 0x3FFF) + 1,
                        height: ((bits >> 14) & 0x3FFF) + 1,
                    };
                }
            }
        }
    } catch {
        // Best-effort
    }

    return { width: 1200, height: 800 };
}

// =============================================================================
// VARIANT UPLOAD (ATOMIC)
// =============================================================================

/**
 * Upload all canonical variants to Supabase Storage atomically.
 */
export async function uploadVariantsToStorage(
    variants: ProcessedImageResult
): Promise<StorageVariantsUploadResult> {
    const config = getSupabaseConfig();
    if (!config) {
        return {
            success: false,
            error: 'Supabase Storage is not configured. Please check environment variables.',
        };
    }

    const client = getServerClient();
    if (!client) {
        return {
            success: false,
            error: 'Failed to initialize Supabase storage client.',
        };
    }

    const paths = generateCanonicalPaths(variants.hash, variants.original.ext);
    const uploadedKeys: string[] = [];

    try {
        // 1. Upload Original
        const { error: errOrig } = await client.storage
            .from(config.bucket)
            .upload(paths.original, variants.original.buffer, {
                contentType: variants.original.mimeType,
                cacheControl: '31536000',
                upsert: true,
            });

        if (errOrig) {
            throw new Error(`Original variant upload failed: ${errOrig.message}`);
        }
        uploadedKeys.push(paths.original);

        // 2. Upload Editorial Thumbnail (4:3, 1200x900)
        const { error: errThumb } = await client.storage
            .from(config.bucket)
            .upload(paths.thumbnail, variants.thumbnail.buffer, {
                contentType: variants.thumbnail.mimeType,
                cacheControl: '31536000',
                upsert: true,
            });

        if (errThumb) {
            throw new Error(`Thumbnail variant upload failed: ${errThumb.message}`);
        }
        uploadedKeys.push(paths.thumbnail);

        // 3. Upload Social / Open Graph (1.91:1, 1200x630)
        const { error: errSocial } = await client.storage
            .from(config.bucket)
            .upload(paths.social, variants.social.buffer, {
                contentType: variants.social.mimeType,
                cacheControl: '31536000',
                upsert: true,
            });

        if (errSocial) {
            throw new Error(`Social variant upload failed: ${errSocial.message}`);
        }
        uploadedKeys.push(paths.social);

        // Retrieve public CDN URLs
        const origUrl = client.storage.from(config.bucket).getPublicUrl(paths.original).data.publicUrl;
        const thumbUrl = client.storage.from(config.bucket).getPublicUrl(paths.thumbnail).data.publicUrl;
        const socialUrl = client.storage.from(config.bucket).getPublicUrl(paths.social).data.publicUrl;

        return {
            success: true,
            data: {
                id: variants.hash,
                url: thumbUrl,
                thumbnailUrl: thumbUrl,
                socialImageUrl: socialUrl,
                originalUrl: origUrl,
                thumbnailKey: paths.thumbnail,
                socialKey: paths.social,
                originalKey: paths.original,
                width: variants.thumbnail.width,
                height: variants.thumbnail.height,
                mimeType: variants.thumbnail.mimeType,
                size: variants.thumbnail.size,
                variants: {
                    original: {
                        url: origUrl,
                        key: paths.original,
                        width: variants.original.width,
                        height: variants.original.height,
                        size: variants.original.size,
                        mimeType: variants.original.mimeType,
                    },
                    thumbnail: {
                        url: thumbUrl,
                        key: paths.thumbnail,
                        width: variants.thumbnail.width,
                        height: variants.thumbnail.height,
                        size: variants.thumbnail.size,
                        mimeType: variants.thumbnail.mimeType,
                    },
                    social: {
                        url: socialUrl,
                        key: paths.social,
                        width: variants.social.width,
                        height: variants.social.height,
                        size: variants.social.size,
                        mimeType: variants.social.mimeType,
                    },
                },
            },
        };
    } catch (err: unknown) {
        // Rollback already uploaded keys on failure
        if (uploadedKeys.length > 0) {
            try {
                await client.storage.from(config.bucket).remove(uploadedKeys);
            } catch {
                // Ignore rollback errors
            }
        }
        const message = err instanceof Error ? err.message : 'Upload processing failed';
        console.error('[SUPABASE] Variant upload error:', message);
        return {
            success: false,
            error: message,
        };
    }
}

// =============================================================================
// LEGACY SINGLE IMAGE UPLOAD (COMPATIBILITY)
// =============================================================================

export async function uploadToStorage(
    buffer: Buffer,
    mimeType: string,
    providedDimensions?: { width: number; height: number }
): Promise<StorageUploadResult> {
    try {
        const config = getSupabaseConfig();
        if (!config) {
            return {
                success: false,
                error: 'Supabase Storage is not configured.',
            };
        }

        const client = getServerClient();
        if (!client) {
            return {
                success: false,
                error: 'Failed to initialize storage client.',
            };
        }

        const MAX_SIZE = 5 * 1024 * 1024;
        if (buffer.length > MAX_SIZE) {
            return {
                success: false,
                error: `Image exceeds maximum size of ${MAX_SIZE / (1024 * 1024)}MB.`,
            };
        }

        const hash = generateImageHash(buffer);
        const key = generateStoragePath(hash, mimeType);
        const dimensions = providedDimensions || extractDimensions(buffer, mimeType);

        const { error: uploadError } = await client.storage
            .from(config.bucket)
            .upload(key, buffer, {
                contentType: mimeType,
                cacheControl: '31536000',
                upsert: true,
            });

        if (uploadError) {
            return {
                success: false,
                error: `Storage upload failed: ${uploadError.message}`,
            };
        }

        const url = client.storage.from(config.bucket).getPublicUrl(key).data.publicUrl;

        return {
            success: true,
            data: {
                id: hash,
                url,
                key,
                width: dimensions.width,
                height: dimensions.height,
                mimeType,
                size: buffer.length,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        return {
            success: false,
            error: `Upload processing failed: ${message}`,
        };
    }
}

// =============================================================================
// SOCIAL IMAGE RESOLUTION (DETERMINISTIC FALLBACK & MIGRATION)
// =============================================================================

/**
 * Ensure a 1200x630 social image exists for a given image URL.
 * If given a thumbnail URL or legacy image URL, checks if the -og-1200x630.jpg variant exists.
 * If not, fetches the image, crops it with sharp to 1200x630 JPEG, and uploads it.
 */
export async function ensureSocialImageForUrl(sourceUrl: string): Promise<string | null> {
    if (!sourceUrl || !sourceUrl.startsWith('https://')) return null;

    // Already a canonical 1200x630 OG image
    if (sourceUrl.includes('-og-1200x630.jpg')) {
        return sourceUrl;
    }

    const config = getSupabaseConfig();
    const client = getServerClient();
    if (!config || !client) return null;

    // Only process URLs that belong to our Supabase bucket
    const key = extractStorageKeyFromUrl(sourceUrl);
    if (!key) return null;

    // Determine target social key
    let socialKey: string;
    if (key.includes('-thumb-4x3.jpg')) {
        socialKey = key.replace('-thumb-4x3.jpg', '-og-1200x630.jpg');
    } else if (key.includes('-original.')) {
        socialKey = key.replace(/-original\.[a-z0-9]+$/i, '-og-1200x630.jpg');
    } else {
        // Legacy format: articles/YYYY/MM/<hash>.<ext>
        socialKey = key.replace(/\.[a-z0-9]+$/i, '-og-1200x630.jpg');
    }

    // Check if the social variant already exists in Supabase
    const candidateUrl = client.storage.from(config.bucket).getPublicUrl(socialKey).data.publicUrl;

    try {
        const headRes = await fetch(candidateUrl, { method: 'HEAD' });
        if (headRes.ok) {
            return candidateUrl;
        }
    } catch {
        // Fall through to generation
    }

    // Variant does not exist yet: download source image, generate social variant, and upload
    try {
        const srcRes = await fetch(sourceUrl);
        if (!srcRes.ok) return null;

        const srcBuffer = Buffer.from(await srcRes.arrayBuffer());
        const socialVariant = await createSocialVariantFromBuffer(srcBuffer);

        const { error: uploadError } = await client.storage
            .from(config.bucket)
            .upload(socialKey, socialVariant.buffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000',
                upsert: true,
            });

        if (uploadError) {
            console.error('[SUPABASE] Failed to upload derived social variant:', uploadError.message);
            return null;
        }

        return candidateUrl;
    } catch (err: unknown) {
        console.error('[SUPABASE] ensureSocialImageForUrl error:', err);
        return null;
    }
}

// =============================================================================
// DELETE
// =============================================================================

export async function deleteFromStorage(key: string): Promise<boolean> {
    try {
        const config = getSupabaseConfig();
        if (!config) return false;

        const client = getServerClient();
        if (!client) return false;

        const { error } = await client.storage
            .from(config.bucket)
            .remove([key]);

        return !error;
    } catch {
        return false;
    }
}

export function extractStorageKeyFromUrl(url: string): string | null {
    try {
        const config = getSupabaseConfig();
        if (!config) return null;

        const bucketPrefix = `/storage/v1/object/public/${config.bucket}/`;
        const idx = url.indexOf(bucketPrefix);
        if (idx === -1) return null;

        const key = url.substring(idx + bucketPrefix.length);
        if (!key || !key.startsWith('articles/')) return null;

        return key;
    } catch {
        return null;
    }
}

export async function deleteMultipleFromStorage(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    try {
        const config = getSupabaseConfig();
        if (!config) return 0;

        const client = getServerClient();
        if (!client) return 0;

        const { error } = await client.storage
            .from(config.bucket)
            .remove(keys);

        if (error) {
            console.error('[SUPABASE] Batch delete error:', error.message);
            return 0;
        }

        return keys.length;
    } catch (e) {
        console.error('[SUPABASE] Batch delete failed:', e);
        return 0;
    }
}
