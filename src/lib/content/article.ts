/**
 * Article Page Data Composition Module
 * 
 * Editorial logic for individual article pages.
 * All validation and data preparation resides here.
 * 
 * NO JSX, NO TAILWIND, NO UI LAYER IMPORTS.
 */

import { getArticleBySlug, getValidSections } from './reader';
import { Article, Section } from './types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Complete article page data structure
 */
export interface ArticlePageData {
    /** The article being displayed */
    article: Article;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Error thrown when an invalid section is requested
 */
export class InvalidArticleSectionError extends Error {
    constructor(
        public readonly section: string,
        public readonly validSections: Section[]
    ) {
        super(
            `Invalid section: "${section}". ` +
            `Valid sections are: ${validSections.join(', ')}`
        );
        this.name = 'InvalidArticleSectionError';
    }
}

/**
 * Error thrown when an article is not found
 */
export class ArticleNotFoundError extends Error {
    constructor(
        public readonly section: string,
        public readonly slug: string
    ) {
        super(
            `Article not found: "${slug}" in section "${section}"`
        );
        this.name = 'ArticleNotFoundError';
    }
}

/**
 * Error thrown when article slug is invalid
 */
export class InvalidSlugError extends Error {
    constructor(
        public readonly slug: string,
        public readonly reason: string
    ) {
        super(`Invalid slug: "${slug}". ${reason}`);
        this.name = 'InvalidSlugError';
    }
}

/**
 * Error thrown when article section doesn't match its location
 */
export class SectionMismatchError extends Error {
    constructor(
        public readonly expectedSection: string,
        public readonly actualSection: string,
        public readonly slug: string
    ) {
        super(
            `Section mismatch for article "${slug}": ` +
            `requested from "${expectedSection}" but article belongs to "${actualSection}"`
        );
        this.name = 'SectionMismatchError';
    }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid section
 */
function isValidSection(section: string): section is Section {
    const validSections = getValidSections();
    return validSections.includes(section as Section);
}

/**
 * Validate section string
 * @throws InvalidArticleSectionError if section is not valid
 */
function validateSection(section: string): Section {
    // Normalize: trim and lowercase
    const normalized = section.trim().toLowerCase();

    if (!isValidSection(normalized)) {
        throw new InvalidArticleSectionError(section, getValidSections());
    }

    return normalized;
}

/**
 * Validate slug string
 * Supports Unicode characters (Kannada, Hindi, etc.) in slugs.
 * @throws InvalidSlugError if slug is invalid
 */
function validateSlug(slug: string): string {
    // Decode URI-encoded characters (browsers encode non-ASCII chars in URLs)
    let decoded: string;
    try {
        decoded = decodeURIComponent(slug).trim();
    } catch {
        decoded = slug.trim();
    }

    // Check if empty
    if (!decoded) {
        throw new InvalidSlugError(slug, 'Slug cannot be empty');
    }

    // Check for valid characters: Unicode letters, Unicode numbers, and hyphens
    const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
    if (!slugPattern.test(decoded)) {
        throw new InvalidSlugError(
            slug,
            'Slug must contain only letters, numbers, and hyphens'
        );
    }

    return decoded;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch article by section and slug with validation
 * @throws ArticleNotFoundError if article doesn't exist
 * @throws SectionMismatchError if article section doesn't match
 */
async function fetchArticle(section: Section, slug: string): Promise<Article> {
    const article = await getArticleBySlug(section, slug);

    if (!article) {
        throw new ArticleNotFoundError(section, slug);
    }

    // Enforce section consistency
    if (article.section !== section) {
        throw new SectionMismatchError(section, article.section, slug);
    }

    return article;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Get all data needed to render an article page.
 * 
 * This is the primary export of this module. It returns a deterministic
 * data structure containing everything needed to render the article page.
 * 
 * The function:
 * - Validates section and slug parameters
 * - Fetches the article from the content reader
 * - Enforces section consistency
 * - Returns the prepared Article object
 * 
 * @param section - The section slug (e.g., 'politics', 'crime', 'world-affairs')
 * @param slug - The article slug (filename without .md extension)
 * @returns ArticlePageData object with the article
 * @throws InvalidArticleSectionError if section is not valid
 * @throws InvalidSlugError if slug is invalid
 * @throws ArticleNotFoundError if article doesn't exist
 * @throws SectionMismatchError if article section doesn't match requested section
 */
export async function getArticlePageData(section: string, slug: string): Promise<ArticlePageData> {
    // Validate section (throws if invalid)
    const validatedSection = validateSection(section);

    // Validate slug (throws if invalid)
    const validatedSlug = validateSlug(slug);

    // Fetch article (throws if not found or section mismatch)
    const article = await fetchArticle(validatedSection, validatedSlug);

    return {
        article,
    };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export Article type for consumers that need it
export type { Article } from './types';
