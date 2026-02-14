/**
 * Content Module Public API
 * Re-exports all public types and functions for content reading
 */

// Types
export type {
    Article,
    ArticleFrontmatter,
    ParsedArticle,
    ContentType,
    Section,
} from './types';

// Error classes
export {
    ContentValidationError,
    ContentParseError,
} from './types';

// Reader functions
export {
    getAllArticles,
    getArticleBySlug,
    getArticlesBySection,
    getLeadArticles,
    getArticlesByTag,
    getAllTags,
    getValidSections,
} from './reader';

// Parser (for advanced use cases)
export { parseMarkdown } from './parser';

// Block Parser (for media block system)
export {
    parseBodyToBlocks,
    serializeBlocksToMarkdown,
    isBlockBasedContent,
    isLegacyContent,
} from './block-parser';

export type {
    BlockParseResult,
    BlockParseError,
} from './block-parser';

// Media Types (for block-based content)
export {
    TEXT_BLOCK_TYPES,
    MEDIA_BLOCK_TYPES,
    MEDIA_LIMITS,
    ALLOWED_IMAGE_FORMATS,
    MAX_IMAGE_SIZE_BYTES,
    SOCIAL_VIDEO_PROVIDERS,
    /** @deprecated Use SOCIAL_VIDEO_PROVIDERS instead */
    SOCIAL_VIDEO_PROVIDERS as ALLOWED_VIDEO_PROVIDERS,
    isTextBlock,
    isMediaBlock,
    isImageBlock,
    isVideoBlock,
    generateBlockId,
    calculateMediaSummary,
    canAddImage,
    getRemainingImageSlots,
    createParagraphBlock,
    createSubheadingBlock,
    createQuoteBlock,
    createImageBlock,
    createVideoBlock,
    reorderBlocks,
} from './media-types';

export type {
    ContentBlockType,
    ContentBlock,
    ParagraphBlock,
    SubheadingBlock,
    QuoteBlock,
    ImageBlock,
    VideoBlock,
    TextBlock,
    MediaBlock,
    ImageAspectRatio,
    SocialVideoProvider,
    /** @deprecated Use SocialVideoProvider instead */
    SocialVideoProvider as VideoProvider,
    AllowedImageFormat,
    MediaAsset,
    FeaturedImage,
    MediaSummary,
} from './media-types';


// Homepage data composition
export type {
    HomepageData,
    HomepageSections,
} from './homepage';

export { getHomepageData } from './homepage';

// Section page data composition
export type {
    SectionPageData,
    SectionInfo,
} from './section';

export {
    getSectionPageData,
    InvalidSectionError,
} from './section';

// Article page data composition
export type {
    ArticlePageData,
} from './article';

export {
    getArticlePageData,
    InvalidArticleSectionError,
    ArticleNotFoundError,
    InvalidSlugError,
    SectionMismatchError,
} from './article';
