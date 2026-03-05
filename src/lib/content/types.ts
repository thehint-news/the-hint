import { ContentBlock } from './media-types';
import { Language } from '@/lib/i18n/language';

/**
 * Article Content Types
 * Strict type definitions for news publication content
 */

/** Valid content types for articles: news or opinion only */
export type ContentType = 'news' | 'opinion';

/** Valid sections that match folder names under /src/content/ */
export type Section =
    | 'politics'
    | 'crime'
    | 'court'
    | 'opinion'
    | 'world-affairs'
    | 'local';

/** Source reference for article citations */
export interface ArticleSource {
    name: string;
    url?: string;
}

/**
 * Lead story image for multi-thumbnail carousel
 * Maximum 3 images allowed
 */
export interface LeadStoryImage {
    /** Image URL (must be from Supabase/R2 storage) */
    url: string;
    /** Alt text for accessibility and SEO */
    alt: string;
    /** Image width in pixels (optional, for aspect ratio calculation) */
    width?: number;
    /** Image height in pixels (optional, for aspect ratio calculation) */
    height?: number;
}

/**
 * Lead story media configuration
 * Only valid when isLead === true
 */
export interface LeadMedia {
    /** Array of carousel images (max 3) */
    images: LeadStoryImage[];
}

/** Maximum number of lead story images allowed */
export const MAX_LEAD_IMAGES = 3;

/**
 * Article translation data structure
 * Stored in frontmatter translations field
 */
export interface ArticleTranslation {
    /** Translation status */
    status?: 'pending' | 'ready' | 'failed';
    /** Translated headline */
    title: string;
    /** Translated subtitle/deck */
    subtitle: string;
    /** Translated body content (markdown or plain text) */
    body?: string;
    /** Translated excerpt/summary */
    excerpt?: string;
    /** Translated content blocks (optional - if not provided, uses original bodyBlocks) */
    bodyBlocks?: ContentBlock[];
    /** Translated tags */
    tags?: string[];
    /** Translated sources */
    sources?: string[];
    /** Translation generation timestamp */
    translatedAt: string;
}

/**
 * Map of translations by language code
 */
export type ArticleTranslations = Partial<Record<Language, ArticleTranslation>>;

/**
 * Complete Article type with all required and optional fields
 * Represents a fully parsed and validated article from Markdown
 */
export interface Article {
    /** Unique identifier derived from filename (slug) */
    id: string;

    /** Section folder the article belongs to */
    section: Section;

    /** Main headline of the article (Kannada/original) */
    title: string;

    /** Secondary headline / deck (Kannada/original) */
    subtitle: string;

    /** Type of content: news or opinion */
    contentType: ContentType;

    /** ISO 8601 publication timestamp */
    publishedAt: string;

    /** ISO 8601 update timestamp, null if never updated */
    updatedAt: string | null;

    /** Placement on homepage: lead, top, or standard */
    placement: 'lead' | 'top' | 'standard';

    /** Categorization tags for the article */
    tags: string[];

    /** Source references and citations */
    sources: string[];

    /** CANONICAL SOURCE: Structured content blocks */
    bodyBlocks?: ContentBlock[];

    /** LEGACY ONLY: Raw Markdown body content (after frontmatter) */
    body?: string;

    /** Featured image URL (optional) */
    image?: string;

    /** Translations by language code - optional for backwards compatibility */
    translations?: ArticleTranslations;

    /** Whether this article is the designated lead story (only ONE can be true globally) */
    isLead?: boolean;

    /** Lead story carousel media - only present if isLead === true */
    leadMedia?: LeadMedia;
}

/**
 * Frontmatter data as parsed from YAML
 * Before validation and transformation to Article
 */
export interface ArticleFrontmatter {
    title: string;
    subtitle: string;
    contentType: ContentType;
    publishedAt: string;
    updatedAt?: string | null;
    placement?: 'lead' | 'top' | 'standard';
    image?: string;
    tags?: string[];
    sources?: string[];
    status?: 'published' | 'draft';
    bodyBlocks?: ContentBlock[];
    /** Optional translations map for multilingual support */
    translations?: ArticleTranslations;
    /** Whether this article is the designated lead story */
    isLead?: boolean;
    /** Lead story carousel media - only valid if isLead === true */
    leadMedia?: LeadMedia;
}

/**
 * Result of parsing a Markdown file
 */
export interface ParsedArticle {
    frontmatter: ArticleFrontmatter;
    body?: string;
}

/**
 * Content validation error with details
 */
export class ContentValidationError extends Error {
    constructor(
        message: string,
        public readonly filePath: string,
        public readonly field?: string
    ) {
        super(`[${filePath}] ${message}`);
        this.name = 'ContentValidationError';
    }
}

/**
 * Content parsing error
 */
export class ContentParseError extends Error {
    constructor(
        message: string,
        public readonly filePath: string
    ) {
        super(`[${filePath}] ${message}`);
        this.name = 'ContentParseError';
    }
}
