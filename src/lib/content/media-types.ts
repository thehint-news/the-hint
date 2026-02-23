/**
 * Media Block Types
 * Strict type definitions for story-integrated media
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * Core Rules:
 * - Media exists ONLY as structured blocks within narrative
 * - Max 3 images (hard limit), Max 1 video (soft limit)
 * - All media is URL-referenced, never embedded
 * - Text context required around all media blocks
 */

// =============================================================================
// BLOCK TYPE DEFINITIONS
// =============================================================================

/** Block types allowed in article body */
export type ContentBlockType =
    | 'paragraph'
    | 'subheading'
    | 'quote'
    | 'image'
    | 'video'
    | 'post';

/** Text block types that qualify as "text context" for media */
export const TEXT_BLOCK_TYPES: ContentBlockType[] = ['paragraph', 'subheading', 'quote'];

/** Media block types (images and videos — used for combined limit) */
export const MEDIA_BLOCK_TYPES: ContentBlockType[] = ['image', 'video'];

/** Special embed block types */
export const EMBED_BLOCK_TYPES: ContentBlockType[] = ['post'];

/** Base block interface - all blocks extend this */
export interface BaseBlock {
    /** Unique block identifier */
    id: string;
    /** Block type discriminator */
    type: ContentBlockType;
    /** Position in article flow (0-indexed) */
    order: number;
}

// =============================================================================
// TEXT BLOCKS
// =============================================================================

/** Paragraph block - primary text content */
export interface ParagraphBlock extends BaseBlock {
    type: 'paragraph';
    /** Markdown-supported text content */
    content: string;
}

/** Subheading block - section dividers */
export interface SubheadingBlock extends BaseBlock {
    type: 'subheading';
    /** Subheading text (rendered as h2/h3) */
    content: string;
}

/** Quote block - pull quotes and citations */
export interface QuoteBlock extends BaseBlock {
    type: 'quote';
    /** Quote text */
    content: string;
    /** Optional attribution (who said it) */
    attribution?: string;
}

// =============================================================================
// IMAGE BLOCK
// =============================================================================

/** Supported aspect ratios for images */
export type ImageAspectRatio = '16:9' | '4:3' | '3:2' | '1:1' | '2:3' | '9:16' | 'original';

/** Image dimensions interface */
export interface ImageDimensions {
    width: number;
    height: number;
}

/** Image block with full metadata */
export interface ImageBlock extends BaseBlock {
    type: 'image';
    /** URL to image (relative or absolute) */
    src: string;
    /** Required accessibility text - MUST be non-empty */
    alt: string;
    /** Optional caption (encouraged for editorial context) */
    caption?: string;
    /** Photographer or source credit */
    credit?: string;
    /** Explicit width in pixels (prevents layout shift) */
    width: number;
    /** Explicit height in pixels (prevents layout shift) */
    height: number;
    /** Aspect ratio for responsive behavior */
    aspectRatio: ImageAspectRatio;
    /** Responsive srcset for multiple sizes */
    srcset?: string;
}

// =============================================================================
// VIDEO BLOCK
// =============================================================================

/** Video source categories */
export type VideoSourceType = 'file' | 'social' | 'cdn';

/** Allowed social video providers */
export type SocialVideoProvider =
    | 'youtube'
    | 'vimeo'
    | 'twitter'
    | 'x'
    | 'instagram'
    | 'facebook'
    | 'tiktok'
    | 'linkedin';

/** Video block - Universal structure for all video types */
export interface VideoBlock extends BaseBlock {
    type: 'video';
    /** Source category determines rendering strategy */
    sourceType: VideoSourceType;
    /** Original input URL */
    originalUrl: string;
    /** Embed URL for social/iframe content (if applicable) */
    embedUrl?: string;
    /** Poster/Thumbnail image URL (required) */
    posterThumbnail: string;
    /** MIME type for direct files */
    mimeType?: string;
    /** Provider name for social videos */
    provider?: SocialVideoProvider;
    /** Video duration in seconds */
    duration?: number;
    /** Caption - REQUIRED for editorial standards */
    caption: string;
    /** Source credit/attribution */
    credit?: string;
    /** Video title (metadata) */
    title?: string;
    /** Raw, trusted oEmbed HTML for rich social previews (Entire Post) */
    trustedSourceHtml?: string;
    /** Flag to force fallback link-preview mode for restricted platforms (e.g. Facebook) */
    isRestricted?: boolean;
}

// =============================================================================
// POST BLOCK (Social Embed — Native Rendering)
// =============================================================================

/** Supported social platforms for post embeds */
export type PostPlatform =
    | 'x'
    | 'facebook'
    | 'instagram'
    | 'youtube'
    | 'linkedin'
    | 'tiktok';

/** All supported post platforms */
export const SUPPORTED_POST_PLATFORMS: PostPlatform[] = [
    'x', 'facebook', 'instagram', 'youtube', 'linkedin', 'tiktok',
];

/** Metadata snapshot taken at insert time */
export interface PostMetadata {
    /** Author display name */
    author: string;
    /** Author username/handle */
    username: string;
    /** Author avatar URL */
    avatar?: string;
    /** Truncated text preview of the post */
    textPreview: string;
    /** Thumbnail image URL */
    thumbnail?: string;
    /** ISO 8601 timestamp of the original post */
    timestamp?: string;
    /** Whether the author is verified on the platform */
    verified?: boolean;
}

/** Post block — renders social content natively without platform scripts */
export interface PostBlock extends BaseBlock {
    type: 'post';
    /** Original URL as entered by the user */
    originalUrl: string;
    /** Normalized canonical URL */
    canonicalUrl: string;
    /** Detected platform */
    platform: PostPlatform;
    /** Cached metadata snapshot */
    metadata: PostMetadata;
}

// =============================================================================
// UNION TYPES
// =============================================================================

/** Text-based blocks that provide "context" for media */
export type TextBlock = ParagraphBlock | SubheadingBlock | QuoteBlock;

/** Media blocks that require text context (images + videos, combined limit) */
export type MediaBlock = ImageBlock | VideoBlock;

/** Union type for all content blocks */
export type ContentBlock =
    | ParagraphBlock
    | SubheadingBlock
    | QuoteBlock
    | ImageBlock
    | VideoBlock
    | PostBlock;

// =============================================================================
// MEDIA LIMITS & CONSTRAINTS
// =============================================================================

/** Media limits enforced by validation */
export const MEDIA_LIMITS = {
    /** @deprecated Use MAX_MEDIA instead. Kept for legacy compatibility. */
    MAX_IMAGES: 3,
    /** @deprecated Use MAX_MEDIA instead. Kept for legacy compatibility. */
    MAX_VIDEOS: 1,
    /** Combined limit: images + videos = 3 (HARD LIMIT) */
    MAX_MEDIA: 3,
    /** Maximum post embeds per article (HARD LIMIT) */
    MAX_POSTS: 1,
    /** How media limit is enforced */
    MEDIA_LIMIT_TYPE: 'hard' as const,
    /** How post limit is enforced */
    POST_LIMIT_TYPE: 'hard' as const,
} as const;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_FORMATS = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
] as const;

export type AllowedImageFormat = typeof ALLOWED_IMAGE_FORMATS[number];

/** Maximum image file size in bytes (5MB) */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed social video providers */
export const SOCIAL_VIDEO_PROVIDERS: SocialVideoProvider[] = [
    'youtube',
    'vimeo',
    'twitter',
    'x',
    'instagram',
    'facebook',
    'tiktok',
    'linkedin'
];

// =============================================================================
// MEDIA ASSET REGISTRY TYPES
// =============================================================================

/** Media asset stored in registry */
export interface MediaAsset {
    /** Unique hash-based identifier */
    id: string;
    /** Asset type */
    type: 'image' | 'video-poster';
    /** Original filename from upload */
    originalFilename: string;
    /** MIME type */
    mimeType: AllowedImageFormat;
    /** File size in bytes */
    size: number;
    /** Image width in pixels */
    width: number;
    /** Image height in pixels */
    height: number;
    /** Upload timestamp (ISO 8601) */
    uploadedAt: string;
    /** URLs for different sizes */
    urls: {
        /** Original/full size URL */
        original: string;
        /** Responsive size variants */
        sizes: Record<string, string>;
    };
    /** Article slugs referencing this asset */
    usedBy: string[];
}

// =============================================================================
// FEATURED IMAGE (FOR HOMEPAGE/SOCIAL)
// =============================================================================

/** Featured image data for article cards */
export interface FeaturedImage {
    /** Image source URL */
    src: string;
    /** Alt text */
    alt: string;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
    /** Srcset for responsive loading */
    srcset?: string;
}

// =============================================================================
// ARTICLE MEDIA SUMMARY
// =============================================================================

/** Summary of media usage in an article */
export interface MediaSummary {
    /** Number of image blocks */
    imageCount: number;
    /** Number of video blocks */
    videoCount: number;
    /** Combined media count (images + videos) */
    mediaCount: number;
    /** Number of post blocks */
    postCount: number;
    /** Quick check for video presence */
    hasVideo: boolean;
    /** Quick check for post presence */
    hasPost: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/** Check if a block is a text block (provides text context) */
export function isTextBlock(block: ContentBlock): block is TextBlock {
    return TEXT_BLOCK_TYPES.includes(block.type);
}

/** Check if a block is a media block */
export function isMediaBlock(block: ContentBlock): block is MediaBlock {
    return MEDIA_BLOCK_TYPES.includes(block.type);
}

/** Check if a block is an image block */
export function isImageBlock(block: ContentBlock): block is ImageBlock {
    return block.type === 'image';
}

/** Check if a block is a video block */
export function isVideoBlock(block: ContentBlock): block is VideoBlock {
    return block.type === 'video';
}

/** Check if a block is a post block */
export function isPostBlock(block: ContentBlock): block is PostBlock {
    return block.type === 'post';
}

/** Check if a block is a paragraph block */
export function isParagraphBlock(block: ContentBlock): block is ParagraphBlock {
    return block.type === 'paragraph';
}

/** Check if a block is a subheading block */
export function isSubheadingBlock(block: ContentBlock): block is SubheadingBlock {
    return block.type === 'subheading';
}

/** Check if a block is a quote block */
export function isQuoteBlock(block: ContentBlock): block is QuoteBlock {
    return block.type === 'quote';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a unique block ID */
export function generateBlockId(type: ContentBlockType): string {
    const prefix = type.substring(0, 3);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}-${timestamp}-${random}`;
}

/** Calculate media summary from blocks */
export function calculateMediaSummary(blocks: ContentBlock[]): MediaSummary {
    const imageCount = blocks.filter(isImageBlock).length;
    const videoCount = blocks.filter(isVideoBlock).length;
    const postCount = blocks.filter(isPostBlock).length;
    return {
        imageCount,
        videoCount,
        mediaCount: imageCount + videoCount,
        postCount,
        hasVideo: videoCount > 0,
        hasPost: postCount > 0,
    };
}

/** Check if more media (images or videos) can be added — combined limit */
export function canAddMedia(blocks: ContentBlock[]): boolean {
    const mediaCount = blocks.filter(b => isImageBlock(b) || isVideoBlock(b)).length;
    return mediaCount < MEDIA_LIMITS.MAX_MEDIA;
}

/** @deprecated Use canAddMedia instead */
export function canAddImage(blocks: ContentBlock[]): boolean {
    return canAddMedia(blocks);
}

/** Check if a post block can be added */
export function canAddPost(blocks: ContentBlock[]): boolean {
    const postCount = blocks.filter(isPostBlock).length;
    return postCount < MEDIA_LIMITS.MAX_POSTS;
}

/** @deprecated Use canAddMedia instead */
export function shouldWarnAboutVideo(blocks: ContentBlock[]): boolean {
    return !canAddMedia(blocks);
}

/** Get remaining media slots (combined images + videos) */
export function getRemainingMediaSlots(blocks: ContentBlock[]): number {
    const mediaCount = blocks.filter(b => isImageBlock(b) || isVideoBlock(b)).length;
    return Math.max(0, MEDIA_LIMITS.MAX_MEDIA - mediaCount);
}

/** @deprecated Use getRemainingMediaSlots instead */
export function getRemainingImageSlots(blocks: ContentBlock[]): number {
    return getRemainingMediaSlots(blocks);
}

// =============================================================================
// BLOCK CREATION HELPERS
// =============================================================================

/** Create a new paragraph block */
export function createParagraphBlock(content: string, order: number): ParagraphBlock {
    return {
        id: generateBlockId('paragraph'),
        type: 'paragraph',
        order,
        content,
    };
}

/** Create a new subheading block */
export function createSubheadingBlock(content: string, order: number): SubheadingBlock {
    return {
        id: generateBlockId('subheading'),
        type: 'subheading',
        order,
        content,
    };
}

/** Create a new quote block */
export function createQuoteBlock(
    content: string,
    order: number,
    attribution?: string
): QuoteBlock {
    return {
        id: generateBlockId('quote'),
        type: 'quote',
        order,
        content,
        attribution,
    };
}

/** Create a new image block */
export function createImageBlock(
    order: number,
    data: Omit<ImageBlock, 'id' | 'type' | 'order'>
): ImageBlock {
    return {
        id: generateBlockId('image'),
        type: 'image',
        order,
        ...data,
    };
}

/** Create a new video block */
export function createVideoBlock(
    order: number,
    data: Omit<VideoBlock, 'id' | 'type' | 'order'>
): VideoBlock {
    return {
        id: generateBlockId('video'),
        type: 'video',
        order,
        ...data,
    };
}

/** Create a new post block */
export function createPostBlock(
    order: number,
    data: Omit<PostBlock, 'id' | 'type' | 'order'>
): PostBlock {
    return {
        id: generateBlockId('post'),
        type: 'post',
        order,
        ...data,
    };
}

/** Reorder blocks after insertion/deletion */
export function reorderBlocks(blocks: ContentBlock[]): ContentBlock[] {
    return blocks.map((block, index) => ({
        ...block,
        order: index,
    }));
}
