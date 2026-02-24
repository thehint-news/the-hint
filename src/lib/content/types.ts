import { ContentBlock } from './media-types';

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
 * Complete Article type with all required and optional fields
 * Represents a fully parsed and validated article from Markdown
 */
export interface Article {
    /** Unique identifier derived from filename (slug) */
    id: string;

    /** Section folder the article belongs to */
    section: Section;

    /** Main headline of the article */
    title: string;

    /** Secondary headline / deck */
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
