/**
 * Supabase Storage — Media Upload
 *
 * Uploads images to Supabase Storage (free tier, no credit card).
 * Returns public CDN URLs. No local filesystem writes.
 *
 * Storage path: articles/{year}/{month}/{hash}.{ext}
 *
 * RULES:
 * - No images in /public/media or in the repository
 * - All images served from Supabase Storage CDN
 * - Max 5MB per image enforced
 * - Graceful failure: never crash on upload error
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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
// (safe because uploads are already gated by our auth middleware)
let _serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient | null {
    if (_serverClient) return _serverClient;

    const config = getSupabaseConfig();
    if (!config) return null;

    // Prefer service role key for server-side operations (bypasses RLS)
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
 * Generate the storage path.
 * Pattern: articles/{year}/{month}/{hash}.{ext}
 */
function generateStoragePath(hash: string, mimeType: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = getExtension(mimeType);
    return `articles/${year}/${month}/${hash}.${ext}`;
}

// =============================================================================
// IMAGE DIMENSION EXTRACTION
// =============================================================================

/**
 * Extract dimensions from an image buffer (PNG/JPEG/WebP).
 * Falls back to defaults if extraction fails.
 */
export function extractDimensions(
    buffer: Buffer,
    mimeType: string
): { width: number; height: number } {
    try {
        // PNG: dimensions at bytes 16-23 in IHDR chunk
        if (mimeType === 'image/png' && buffer.length > 24) {
            if (buffer.toString('ascii', 1, 4) === 'PNG') {
                return {
                    width: buffer.readUInt32BE(16),
                    height: buffer.readUInt32BE(20),
                };
            }
        }

        // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
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

        // WebP: RIFF header, VP8 chunk
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
        // Dimension extraction is best-effort
    }

    // Default fallback
    return { width: 1200, height: 800 };
}

// =============================================================================
// UPLOAD
// =============================================================================

/**
 * Upload an image to Supabase Storage.
 *
 * - Generates a hash-based filename
 * - Stores under articles/{year}/{month}/{hash}.{ext}
 * - Returns the public CDN URL
 * - Fails gracefully: returns error, never throws
 */
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
                error: 'Supabase Storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
            };
        }

        const client = getServerClient();
        if (!client) {
            return {
                success: false,
                error: 'Failed to initialize storage client. Check SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
            };
        }

        // Validate file size (5MB max)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (buffer.length > MAX_SIZE) {
            return {
                success: false,
                error: `Image exceeds maximum size of ${MAX_SIZE / (1024 * 1024)}MB.`,
            };
        }

        // Generate unique path
        const hash = generateImageHash(buffer);
        const key = generateStoragePath(hash, mimeType);

        // Extract dimensions
        const dimensions = providedDimensions || extractDimensions(buffer, mimeType);

        // Upload to Supabase Storage
        const { error: uploadError } = await client.storage
            .from(config.bucket)
            .upload(key, buffer, {
                contentType: mimeType,
                cacheControl: '31536000', // 1 year cache (immutable content-addressed)
                upsert: true, // Allow re-upload of same hash (idempotent)
            });

        if (uploadError) {
            console.error('[SUPABASE] Upload error:', uploadError.message, uploadError);
            return {
                success: false,
                error: `Storage upload failed: ${uploadError.message}`,
            };
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from(config.bucket)
            .getPublicUrl(key);

        const url = urlData.publicUrl;

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
        console.error('[SUPABASE] Upload failed:', message, error);
        return {
            success: false,
            error: `Upload processing failed: ${message}`,
        };
    }
}

// =============================================================================
// DELETE
// =============================================================================

/**
 * Delete an image from storage. Fire-and-forget safe.
 */
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

/**
 * Extract the storage key from a Supabase public URL.
 * URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{key}
 * Returns null if the URL is not from our Supabase storage.
 */
export function extractStorageKeyFromUrl(url: string): string | null {
    try {
        const config = getSupabaseConfig();
        if (!config) return null;

        // Match the Supabase storage URL pattern
        // e.g. https://xxx.supabase.co/storage/v1/object/public/article-images/articles/2026/03/abc123.webp
        const bucketPrefix = `/storage/v1/object/public/${config.bucket}/`;
        const idx = url.indexOf(bucketPrefix);
        if (idx === -1) return null;

        const key = url.substring(idx + bucketPrefix.length);
        // Basic validation: key should start with "articles/" and have content
        if (!key || !key.startsWith('articles/')) return null;

        return key;
    } catch {
        return null;
    }
}

/**
 * Delete multiple images from storage in a single call.
 * Fire-and-forget safe — never throws.
 * Returns the count of successfully deleted keys.
 */
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
