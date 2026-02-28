/**
 * Article Validation Utilities
 * Server-side validation for publishing articles
 * 
 * CRITICAL: All validation happens server-side.
 * Client validation is ONLY for UX assistance.
 */

import { Section } from '../content/types';
import { ContentBlock } from '../content/media-types';

/** Valid content types - ONLY news or opinion */
export type ContentType = 'news' | 'opinion';
export const VALID_CONTENT_TYPES: ContentType[] = ['news', 'opinion'];

/** Valid sections */
export const VALID_SECTIONS: Section[] = [
    'politics',
    'crime',
    'court',
    'opinion',
    'world-affairs',
    'local',
];

/** Valid statuses */
export type ArticleStatus = 'draft' | 'published';
export const VALID_STATUSES: ArticleStatus[] = ['draft', 'published'];

/** Valid placements */
export type Placement = 'lead' | 'top' | 'standard';
export const VALID_PLACEMENTS: Placement[] = ['lead', 'top', 'standard'];

/** Validation constants */
export const HEADLINE_MIN_LENGTH = 10;
export const MAX_TAGS = 10;

/** Validation result for a single field */
export interface FieldValidationError {
    field: string;
    message: string;
}

/** Complete validation result */
export interface ValidationResult {
    isValid: boolean;
    errors: FieldValidationError[];
}

/**
 * Sanitize a string input by trimming and removing dangerous characters.
 * Preserves text exactly (no mutation beyond whitespace normalization).
 */
export function sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
        return '';
    }
    // Trim whitespace and normalize line endings
    return input.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Sanitize an array of strings.
 * Each entry must be non-empty.
 */
export function sanitizeStringArray(input: unknown): string[] {
    if (!Array.isArray(input)) {
        return [];
    }
    return input
        .filter((item): item is string => typeof item === 'string')
        .map(item => sanitizeString(item))
        .filter(item => item.length > 0);
}

/**
 * Normalize tags: lowercase, trim, deduplicate, max 10
 */
export function normalizeTags(input: unknown): string[] {
    const sanitized = sanitizeStringArray(input);
    const lowercased = sanitized.map(tag => tag.toLowerCase());
    const deduplicated = [...new Set(lowercased)];
    return deduplicated.slice(0, MAX_TAGS);
}

/**
 * Generate a URL-safe slug from a headline.
 * - Lowercase
 * - Hyphen-separated
 * - Remove punctuation (preserves Unicode letters/numbers like Kannada, Hindi, etc.)
 * - Deterministic
 */
export function generateSlug(headline: string): string {
    return headline
        .toLowerCase()
        .trim()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove all characters except Unicode letters, Unicode numbers, and hyphens
        .replace(/[^\p{L}\p{N}-]/gu, '')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Check if string is only punctuation (no alphanumeric)
 * Supports Unicode letters and numbers (Kannada, Hindi, etc.)
 */
export function isOnlyPunctuation(value: string): boolean {
    // Remove all whitespace and check if remaining is only punctuation
    const stripped = value.replace(/\s/g, '');
    if (stripped.length === 0) return true;
    // Check if there's at least one letter or number (including Unicode scripts)
    return !/[\p{L}\p{N}]/u.test(stripped);
}

/**
 * Check if body content has at least one paragraph (non-empty content)
 */
export function hasValidParagraph(body: string): boolean {
    const trimmed = body.trim();
    if (!trimmed) return false;
    // Check for at least one line with actual content (not just whitespace)
    const lines = trimmed.split('\n');
    return lines.some(line => line.trim().length > 0);
}

/**
 * Validate that a string is non-empty
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate content type
 */
export function isValidContentType(value: unknown): value is ContentType {
    return typeof value === 'string' && VALID_CONTENT_TYPES.includes(value as ContentType);
}

/**
 * Validate section
 */
export function isValidSection(value: unknown): value is Section {
    return typeof value === 'string' && VALID_SECTIONS.includes(value as Section);
}

/**
 * Validate status
 */
export function isValidStatus(value: unknown): value is ArticleStatus {
    return typeof value === 'string' && VALID_STATUSES.includes(value as ArticleStatus);
}

/**
 * Validate placement
 */
export function isValidPlacement(value: unknown): value is Placement {
    return typeof value === 'string' && VALID_PLACEMENTS.includes(value as Placement);
}

/**
 * Article publish data interface (raw input from form)
 * Uses headline/subheadline as per spec
 */
export interface PublishArticleInput {
    headline: unknown;
    subheadline: unknown;
    section: unknown;
    contentType: unknown;
    body: unknown;
    bodyBlocks?: unknown;
    tags: unknown;
    placement: unknown;
    status: unknown;
    sources: unknown;
    slug?: unknown;
    thumbnail?: unknown;
    /** Whether this article should be marked as the lead story */
    isLead?: unknown;
    /** Lead story carousel media - only valid if isLead === true */
    leadMedia?: unknown;
}

/**
 * Draft-specific input (less strict validation)
 */
export interface DraftArticleInput {
    headline: unknown;
    subheadline?: unknown;
    section?: unknown;
    contentType?: unknown;
    body: unknown;
    bodyBlocks?: unknown;
    tags?: unknown;
    placement?: unknown;
    sources?: unknown;
    thumbnail?: unknown;
    draftId?: unknown;
    isLead?: unknown;
    leadMedia?: unknown;
}

/**
 * Validated article data ready for publishing
 */
export interface ValidatedArticleData {
    headline: string;
    subheadline: string;
    section: Section;
    contentType: ContentType;
    body: string;
    bodyBlocks?: ContentBlock[];
    tags: string[];
    placement: Placement;
    status: ArticleStatus;
    sources: string[];
    slug: string;
    thumbnail?: string;
    isLead?: boolean;
    leadMedia?: {
        images: {
            url: string;
            alt: string;
            width?: number;
            height?: number;
        }[];
    };
}

/**
 * Validated draft data
 */
export interface ValidatedDraftData {
    draftId: string;
    headline: string;
    subheadline: string;
    section: Section;
    contentType: ContentType;
    body: string;
    bodyBlocks?: ContentBlock[];
    tags: string[];
    placement: Placement;
    sources: string[];
    thumbnail?: string;
    slug?: string;
    savedAt: string;
    isLead?: boolean;
    leadMedia?: {
        images: {
            url: string;
            alt: string;
            width?: number;
            height?: number;
        }[];
    };
}

/**
 * Validate all article fields for PUBLISHING.
 * This is the strictest validation - all fields must pass.
 */
export function validateArticleInput(input: PublishArticleInput): ValidationResult {
    const errors: FieldValidationError[] = [];
    const headline = sanitizeString(input.headline);
    const subheadline = sanitizeString(input.subheadline);
    const body = sanitizeString(input.body);

    // HEADLINE validation
    if (!headline) {
        errors.push({ field: 'headline', message: 'Headline is required' });
    } else {
        if (headline.length < HEADLINE_MIN_LENGTH) {
            errors.push({
                field: 'headline',
                message: `Headline must be at least ${HEADLINE_MIN_LENGTH} characters`
            });
        }
        if (isOnlyPunctuation(headline)) {
            errors.push({
                field: 'headline',
                message: 'Headline must contain at least one alphanumeric character'
            });
        }
    }

    // SUBHEADLINE validation (required)
    if (!subheadline) {
        errors.push({ field: 'subheadline', message: 'Subheadline is required' });
    }

    // BODY validation
    // bodyBlocks is the canonical content source; body is legacy fallback
    const hasBodyBlocks = Array.isArray(input.bodyBlocks) && (input.bodyBlocks as ContentBlock[]).length > 0;
    if (!body && !hasBodyBlocks) {
        errors.push({ field: 'body', message: 'Article body is required' });
    } else if (!hasBodyBlocks && body && !hasValidParagraph(body)) {
        errors.push({
            field: 'body',
            message: 'Article body must contain at least one paragraph of content'
        });
    }

    // SECTION validation
    if (!isValidSection(input.section)) {
        errors.push({
            field: 'section',
            message: `Section must be one of: ${VALID_SECTIONS.join(', ')}`
        });
    }

    // CONTENT TYPE validation
    if (!isValidContentType(input.contentType)) {
        errors.push({
            field: 'contentType',
            message: `Content type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
        });
    }

    // CRITICAL RULE: Opinion contentType MUST be in opinion section
    if (input.contentType === 'opinion' && input.section !== 'opinion') {
        errors.push({
            field: 'contentType',
            message: 'Opinion articles MUST be published in the Opinion section'
        });
    }

    // STATUS validation
    if (!isValidStatus(input.status)) {
        errors.push({
            field: 'status',
            message: `Status must be one of: ${VALID_STATUSES.join(', ')}`
        });
    }

    // PLACEMENT validation
    if (!isValidPlacement(input.placement)) {
        errors.push({
            field: 'placement',
            message: `Placement must be one of: ${VALID_PLACEMENTS.join(', ')}`
        });
    }

    // TAGS validation (optional but check format)
    if (input.tags !== undefined && input.tags !== null && !Array.isArray(input.tags)) {
        errors.push({ field: 'tags', message: 'Tags must be an array of strings' });
    } else if (Array.isArray(input.tags)) {
        const validTags = sanitizeStringArray(input.tags);
        if (validTags.length > MAX_TAGS) {
            errors.push({ field: 'tags', message: `Maximum ${MAX_TAGS} tags allowed` });
        }
    }

    // SOURCES validation (optional but each entry must be non-empty)
    if (input.sources !== undefined && input.sources !== null && !Array.isArray(input.sources)) {
        errors.push({ field: 'sources', message: 'Sources must be an array of strings' });
    }

    // THUMBNAIL validation
    // Thumbnail is required UNLESS article is marked as lead story
    const isLeadStory = input.isLead === true;
    const hasThumbnail = input.thumbnail && typeof input.thumbnail === 'string' && input.thumbnail.trim();

    console.log('[VALIDATION] Thumbnail check:', { isLeadStory, hasThumbnail: !!hasThumbnail, thumbnail: input.thumbnail });

    if (!hasThumbnail && !isLeadStory) {
        errors.push({ field: 'thumbnail', message: 'Thumbnail image is required' });
    }

    // LEAD MEDIA validation (only if isLead is true)
    if (input.isLead === true) {
        // Validate leadMedia structure if provided
        if (input.leadMedia !== undefined) {
            if (typeof input.leadMedia !== 'object' || input.leadMedia === null) {
                errors.push({ field: 'leadMedia', message: 'Lead media must be an object' });
            } else {
                const leadMedia = input.leadMedia as { images?: unknown };

                // Validate images array
                if (leadMedia.images !== undefined) {
                    if (!Array.isArray(leadMedia.images)) {
                        errors.push({ field: 'leadMedia.images', message: 'Lead media images must be an array' });
                    } else if (leadMedia.images.length > 3) {
                        errors.push({ field: 'leadMedia.images', message: 'Maximum 3 lead images allowed' });
                    } else {
                        // Validate each image
                        leadMedia.images.forEach((img, index) => {
                            if (typeof img !== 'object' || img === null) {
                                errors.push({ field: `leadMedia.images[${index}]`, message: 'Image must be an object' });
                                return;
                            }

                            const image = img as Record<string, unknown>;

                            if (!image.url || typeof image.url !== 'string' || !image.url.trim()) {
                                errors.push({ field: `leadMedia.images[${index}].url`, message: 'Image URL is required' });
                            } else {
                                // Validate URL is from allowed storage
                                const url = image.url;
                                const isAllowedStorage =
                                    url.includes('supabase.co') ||
                                    url.includes('r2.cloudflarestorage.com') ||
                                    url.startsWith('/media/') ||
                                    url.startsWith('https://www.thehintnews.in/media/');

                                if (!isAllowedStorage && url.startsWith('http')) {
                                    errors.push({ field: `leadMedia.images[${index}].url`, message: 'Image URL must be from approved storage (Supabase/R2)' });
                                }
                            }

                            if (!image.alt || typeof image.alt !== 'string' || !image.alt.trim()) {
                                errors.push({ field: `leadMedia.images[${index}].alt`, message: 'Image alt text is required' });
                            }

                            if (image.width !== undefined && (typeof image.width !== 'number' || image.width <= 0)) {
                                errors.push({ field: `leadMedia.images[${index}].width`, message: 'Width must be a positive number' });
                            }

                            if (image.height !== undefined && (typeof image.height !== 'number' || image.height <= 0)) {
                                errors.push({ field: `leadMedia.images[${index}].height`, message: 'Height must be a positive number' });
                            }
                        });
                    }
                }
            }
        }
    } else {
        // If isLead is not true, leadMedia should not be present
        // This is a warning - the API will ignore leadMedia if isLead is false
        if (input.leadMedia !== undefined) {
            // Non-blocking: log warning but don't fail validation
            // The publish API will strip leadMedia if isLead is false
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate fields for DRAFT saving.
 * COMPLETELY LENIENT - no mandatory fields.
 * Any edit can be saved. Only validates format if values are provided.
 */
export function validateDraftInput(input: DraftArticleInput): ValidationResult {
    const errors: FieldValidationError[] = [];

    // No mandatory fields for drafts - any edit can be saved
    // Only validate format of optional fields if provided

    // If section provided, validate it
    if (input.section !== undefined && input.section !== null && input.section !== '') {
        if (!isValidSection(input.section)) {
            errors.push({
                field: 'section',
                message: `Section must be one of: ${VALID_SECTIONS.join(', ')}`
            });
        }
    }

    // If contentType provided, validate it
    if (input.contentType !== undefined && input.contentType !== null && input.contentType !== '') {
        if (!isValidContentType(input.contentType)) {
            errors.push({
                field: 'contentType',
                message: `Content type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Transform and sanitize validated input into clean article data for PUBLISHING.
 */
export function transformToValidatedData(input: PublishArticleInput): ValidatedArticleData {
    const headline = sanitizeString(input.headline);
    const subheadline = sanitizeString(input.subheadline);
    const body = sanitizeString(input.body);
    const section = input.section as Section;
    const contentType = input.contentType as ContentType;
    const placement = input.placement as Placement;
    const status = input.status as ArticleStatus;
    const tags = normalizeTags(input.tags);
    const sources = sanitizeStringArray(input.sources);
    const slug = typeof input.slug === 'string' && input.slug ? input.slug : generateSlug(headline);
    const bodyBlocks = Array.isArray(input.bodyBlocks) ? (input.bodyBlocks as ContentBlock[]) : undefined;

    // Parse isLead - must be explicitly true
    const isLead = input.isLead === true;

    // Parse leadMedia - only valid if isLead is true
    let leadMedia: ValidatedArticleData['leadMedia'] = undefined;
    if (isLead && input.leadMedia && typeof input.leadMedia === 'object') {
        const lm = input.leadMedia as { images?: unknown[] };
        if (Array.isArray(lm.images)) {
            leadMedia = {
                images: lm.images
                    .filter((img): img is Record<string, unknown> =>
                        typeof img === 'object' && img !== null
                    )
                    .map(img => ({
                        url: String(img.url || ''),
                        alt: String(img.alt || ''),
                        width: typeof img.width === 'number' ? img.width : undefined,
                        height: typeof img.height === 'number' ? img.height : undefined,
                    }))
                    .filter(img => img.url && img.alt), // Only include valid images
            };
            // If no valid images, set to undefined
            if (leadMedia.images.length === 0) {
                leadMedia = undefined;
            }
        }
    }

    // Determine thumbnail: use input or fall back to first lead image
    let thumbnail = typeof input.thumbnail === 'string' && input.thumbnail.trim()
        ? input.thumbnail
        : undefined;

    // If no thumbnail but has lead images, use first lead image as thumbnail
    if (!thumbnail && isLead && leadMedia && leadMedia.images.length > 0) {
        thumbnail = leadMedia.images[0].url;
    }

    return {
        headline,
        subheadline,
        section,
        contentType,
        body,
        bodyBlocks,
        tags,
        placement,
        status,
        sources,
        slug,
        thumbnail,
        isLead,
        leadMedia,
    };
}

/**
 * Transform draft input into validated draft data.
 */
export function transformToDraftData(input: DraftArticleInput, draftId?: string): ValidatedDraftData {
    const headline = sanitizeString(input.headline);
    const subheadline = sanitizeString(input.subheadline);
    const body = sanitizeString(input.body);
    const section = isValidSection(input.section) ? input.section : 'politics';
    const contentType = isValidContentType(input.contentType) ? input.contentType : 'news';
    const placement = isValidPlacement(input.placement) ? input.placement : 'standard';
    const tags = normalizeTags(input.tags);
    const sources = sanitizeStringArray(input.sources);
    const thumbnail = typeof input.thumbnail === 'string' ? input.thumbnail : undefined;
    const slug = typeof (input as unknown as Record<string, unknown>).slug === 'string' ? (input as unknown as Record<string, unknown>).slug as string : undefined;
    const bodyBlocks = Array.isArray(input.bodyBlocks) ? (input.bodyBlocks as ContentBlock[]) : undefined;

    // Parse isLead
    const isLead = input.isLead === true;

    // Parse leadMedia
    let leadMedia: ValidatedDraftData['leadMedia'] = undefined;
    if (input.leadMedia && typeof input.leadMedia === 'object' && !Array.isArray(input.leadMedia)) {
        const lm = input.leadMedia as { images?: unknown[] };
        if (Array.isArray(lm.images)) {
            leadMedia = {
                images: lm.images
                    .filter((img): img is Record<string, unknown> =>
                        typeof img === 'object' && img !== null
                    )
                    .map(img => ({
                        url: String(img.url || ''),
                        alt: String(img.alt || ''),
                        width: typeof img.width === 'number' ? img.width : undefined,
                        height: typeof img.height === 'number' ? img.height : undefined,
                    }))
                    .filter(img => img.url && img.alt),
            };
            if (leadMedia.images.length === 0) {
                leadMedia = undefined;
            }
        }
    }

    return {
        draftId: draftId || generateDraftId(),
        headline,
        subheadline,
        section,
        contentType,
        body,
        bodyBlocks,
        tags,
        placement,
        sources,
        thumbnail,
        slug,
        savedAt: new Date().toISOString(),
        isLead,
        leadMedia,
    };
}

/**
 * Generate a unique draft ID
 */
export function generateDraftId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `draft-${timestamp}-${random}`;
}
