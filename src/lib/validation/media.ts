/**
 * Media Validation Utilities
 * Server-side validation for media blocks in articles
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * CRITICAL: All validation happens server-side.
 * Client validation is ONLY for UX assistance.
 * 
 * Rules Enforced:
 * - Max 3 images (hard block)
 * - Max 1 video (soft warning)
 * - Media blocks must have text context (before AND after)
 * - Consecutive media blocks not allowed
 * - Alt text required for all images
 * - Explicit dimensions required for images
 */

import {
    ContentBlock,
    ImageBlock,
    VideoBlock,
    MEDIA_LIMITS,
    ALLOWED_IMAGE_FORMATS,
    MAX_IMAGE_SIZE_BYTES,
    SOCIAL_VIDEO_PROVIDERS,
    isTextBlock,
    isImageBlock,
    isVideoBlock,
    AllowedImageFormat,
} from '../content/media-types';

// ... (skipping types section which I will update in next chunk if needed or just use imports)

// =============================================================================
// VIDEO BLOCK VALIDATION
// =============================================================================

/**
 * Validate a single video block
 */
function validateVideoBlock(
    block: VideoBlock,
    index: number,
    errors: MediaValidationError[]
): void {
    // Original URL required
    if (!block.originalUrl || block.originalUrl.trim() === '') {
        errors.push({
            type: 'invalid_video_url',
            message: 'Video URL is required',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Source Type required
    if (!block.sourceType) {
        errors.push({
            type: 'invalid_video_url',
            message: 'Video source type is required',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Poster Thumbnail check
    // Required for File/CDN sources (to show before play).
    // Optional for Social sources (iframe can self-render preview).
    if (block.sourceType !== 'social' && (!block.posterThumbnail || block.posterThumbnail.trim() === '')) {
        errors.push({
            type: 'missing_poster_url',
            message: 'Video requires a poster/thumbnail image',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Caption REQUIRED
    if (!block.caption || block.caption.trim() === '') {
        errors.push({
            type: 'missing_caption', // We can reuse this type or make it error
            message: 'Video caption is required',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Provider validation (only if social)
    if (block.sourceType === 'social' && block.provider) {
        // Optional check if we want to enforce provider list
        if (typeof block.provider === 'string' && !SOCIAL_VIDEO_PROVIDERS.includes(block.provider as any)) {
            // Maybe warning or just ignore
        }
    }
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

/** Error types for media validation */
export type MediaValidationErrorType =
    | 'image_limit_exceeded'
    | 'video_limit_exceeded'
    | 'missing_alt_text'
    | 'empty_alt_text'
    | 'invalid_image_url'
    | 'invalid_video_url'
    | 'missing_dimensions'
    | 'invalid_dimensions'
    | 'no_text_context_before'
    | 'no_text_context_after'
    | 'consecutive_media_blocks'
    | 'article_starts_with_media'
    | 'article_ends_with_media'
    | 'invalid_image_format'
    | 'image_too_large'
    | 'invalid_video_provider'
    | 'missing_poster_url'
    | 'empty_blocks'
    | 'missing_caption'
    | 'media_only_article';

/** Warning types for media validation */
export type MediaValidationWarningType =
    | 'video_soft_limit'
    | 'missing_caption'
    | 'missing_credit';

/** A single validation error */
export interface MediaValidationError {
    /** Error type identifier */
    type: MediaValidationErrorType;
    /** Human-readable error message */
    message: string;
    /** Block ID where error occurred (if applicable) */
    blockId?: string;
    /** Block index in array (for debugging) */
    blockIndex?: number;
}

/** A single validation warning (non-blocking) */
export interface MediaValidationWarning {
    /** Warning type identifier */
    type: MediaValidationWarningType;
    /** Human-readable warning message */
    message: string;
    /** Block ID where warning applies (if applicable) */
    blockId?: string;
    /** Block index in array */
    blockIndex?: number;
}

/** Complete validation result */
export interface MediaValidationResult {
    /** Whether all hard validations passed */
    isValid: boolean;
    /** Blocking errors that prevent publishing */
    errors: MediaValidationError[];
    /** Non-blocking warnings */
    warnings: MediaValidationWarning[];
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate all media blocks in an article.
 * This is the primary validation function called before publishing.
 * 
 * @param blocks - Array of content blocks to validate
 * @returns Validation result with errors and warnings
 */
export function validateMediaBlocks(blocks: ContentBlock[]): MediaValidationResult {
    const errors: MediaValidationError[] = [];
    const warnings: MediaValidationWarning[] = [];

    // Empty blocks check
    if (!blocks || blocks.length === 0) {
        errors.push({
            type: 'empty_blocks',
            message: 'Article must contain at least one content block',
        });
        return { isValid: false, errors, warnings };
    }

    // Count media blocks
    const imageBlocks = blocks.filter(isImageBlock);
    const videoBlocks = blocks.filter(isVideoBlock);
    const textBlocks = blocks.filter(isTextBlock);

    // Check for media-only article
    if (textBlocks.length === 0) {
        errors.push({
            type: 'media_only_article',
            message: 'Article cannot contain only media. Text content is required.',
        });
    }

    // HARD LIMITS (Hard Blocks)
    if (imageBlocks.length > MEDIA_LIMITS.MAX_IMAGES) {
        errors.push({
            type: 'image_limit_exceeded',
            message: `Maximum ${MEDIA_LIMITS.MAX_IMAGES} images allowed per article. Found: ${imageBlocks.length}.`,
        });
    }

    if (videoBlocks.length > MEDIA_LIMITS.MAX_VIDEOS) {
        errors.push({
            type: 'video_limit_exceeded',
            message: `Maximum ${MEDIA_LIMITS.MAX_VIDEOS} video allowed per article. Found: ${videoBlocks.length}.`,
        });
    }

    // Validate blocks and enforce placement rules
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        // 1. Individual block validation
        if (isImageBlock(block)) {
            validateImageBlock(block, i, errors, warnings);
        }
        if (isVideoBlock(block)) {
            validateVideoBlock(block, i, errors);
        }

        // 2. Structural/Placement Rules (Re-enabled per Master Checklist)
        if (isImageBlock(block) || isVideoBlock(block)) {
            // Cannot be first
            if (i === 0) {
                errors.push({
                    type: 'article_starts_with_media',
                    message: `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} cannot be the first block in an article.`,
                    blockId: block.id,
                    blockIndex: i
                });
            }

            // Cannot be last
            if (i === blocks.length - 1) {
                errors.push({
                    type: 'article_ends_with_media',
                    message: `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} cannot be the last block in an article.`,
                    blockId: block.id,
                    blockIndex: i
                });
            }

            // Cannot be consecutive
            if (i > 0 && (isImageBlock(blocks[i - 1]) || isVideoBlock(blocks[i - 1]))) {
                errors.push({
                    type: 'consecutive_media_blocks',
                    message: 'Consecutive media blocks are not allowed. Add text context between images or videos.',
                    blockId: block.id,
                    blockIndex: i
                });
            }

            // Must have text context
            const prevIsText = i > 0 && isTextBlock(blocks[i - 1]);
            const nextIsText = i < blocks.length - 1 && isTextBlock(blocks[i + 1]);

            if (!prevIsText && i > 0) {
                errors.push({
                    type: 'no_text_context_before',
                    message: `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} must be preceded by a text paragraph.`,
                    blockId: block.id,
                    blockIndex: i
                });
            }
            if (!nextIsText && i < blocks.length - 1) {
                errors.push({
                    type: 'no_text_context_after',
                    message: `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} must be followed by a text paragraph.`,
                    blockId: block.id,
                    blockIndex: i
                });
            }
        }
    }


    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// =============================================================================
// IMAGE BLOCK VALIDATION
// =============================================================================

/**
 * Validate a single image block
 */
function validateImageBlock(
    block: ImageBlock,
    index: number,
    errors: MediaValidationError[],
    warnings: MediaValidationWarning[]
): void {
    // Alt text is REQUIRED
    if (block.alt === undefined || block.alt === null) {
        errors.push({
            type: 'missing_alt_text',
            message: 'Image requires alt text for accessibility',
            blockId: block.id,
            blockIndex: index,
        });
    } else if (block.alt.trim() === '') {
        errors.push({
            type: 'empty_alt_text',
            message: 'Image alt text cannot be empty',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Dimensions are REQUIRED (prevents layout shift)
    if (!block.width || !block.height) {
        errors.push({
            type: 'missing_dimensions',
            message: 'Image requires explicit width and height dimensions',
            blockId: block.id,
            blockIndex: index,
        });
    } else if (block.width <= 0 || block.height <= 0) {
        errors.push({
            type: 'invalid_dimensions',
            message: 'Image dimensions must be positive numbers',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // URL is required
    if (!block.src || block.src.trim() === '') {
        errors.push({
            type: 'invalid_image_url',
            message: 'Image source URL is required',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Caption warning (encouraged but not required)
    if (!block.caption || block.caption.trim() === '') {
        warnings.push({
            type: 'missing_caption',
            message: 'Consider adding a caption to provide editorial context',
            blockId: block.id,
            blockIndex: index,
        });
    }

    // Credit warning
    if (!block.credit || block.credit.trim() === '') {
        warnings.push({
            type: 'missing_credit',
            message: 'Consider adding a photo credit',
            blockId: block.id,
            blockIndex: index,
        });
    }
}

// =============================================================================
// BLOCK ORDER VALIDATION (for drag-drop)
// =============================================================================

/**
 * Check if a proposed block order is valid
 * Used for drag-and-drop validation
 */
export function isValidBlockOrder(blocks: ContentBlock[]): MediaValidationResult {
    // Use the main validation function but filter to order-related errors only
    const result = validateMediaBlocks(blocks);

    const orderErrors = result.errors.filter(e =>
        e.type === 'article_starts_with_media' ||
        e.type === 'article_ends_with_media' ||
        e.type === 'consecutive_media_blocks' ||
        e.type === 'no_text_context_before' ||
        e.type === 'no_text_context_after'
    );

    return {
        isValid: orderErrors.length === 0,
        errors: orderErrors,
        warnings: [], // Don't surface warnings during drag
    };
}

/**
 * Check if inserting a media block at a specific position is valid
 */
export function canInsertMediaAt(
    blocks: ContentBlock[],
    _position: number,
    mediaType: 'image' | 'video'
): { valid: boolean; reason?: string } {
    // Helper options for validation
    // Removing position checks per "no minimum rule" request


    // Check limits
    if (mediaType === 'image') {
        const imageCount = blocks.filter(isImageBlock).length;
        if (imageCount >= MEDIA_LIMITS.MAX_IMAGES) {
            return { valid: false, reason: `Maximum ${MEDIA_LIMITS.MAX_IMAGES} images allowed` };
        }
    }

    if (mediaType === 'video') {
        const videoCount = blocks.filter(isVideoBlock).length;
        if (videoCount >= MEDIA_LIMITS.MAX_VIDEOS) {
            return { valid: false, reason: `Maximum ${MEDIA_LIMITS.MAX_VIDEOS} video allowed per article` };
        }
    }

    return { valid: true };
}

// =============================================================================
// FILE UPLOAD VALIDATION
// =============================================================================

/**
 * Validate an image file before upload
 */
export function validateImageFile(
    file: { size: number; type: string; name: string }
): MediaValidationResult {
    const errors: MediaValidationError[] = [];
    const warnings: MediaValidationWarning[] = [];

    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
        errors.push({
            type: 'image_too_large',
            message: `Image file is ${sizeMB}MB. Maximum allowed is ${maxMB}MB.`,
        });
    }

    // Check file type
    if (!ALLOWED_IMAGE_FORMATS.includes(file.type as AllowedImageFormat)) {
        errors.push({
            type: 'invalid_image_format',
            message: `Image format "${file.type}" is not supported. Allowed: JPEG, PNG, WebP, AVIF`,
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
