import yaml from 'js-yaml';
import {
    ParsedArticle,
    ArticleFrontmatter,
    ContentParseError
} from './types';
import { ContentBlock } from './media-types';

/** Regex to match YAML frontmatter delimited by ---
 *  Matches:
 *  1. Start of file
 *  2. Three dashes + optional whitespace + newline
 *  3. (Capture 1) Frontmatter content
 *  4. Newline + Three dashes + optional whitespace + newline
 *  5. (Capture 2) Body content
 */
const FRONTMATTER_REGEX = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;

/**
 * Validate and type-check parsed frontmatter
 */
function validateFrontmatter(
    data: Record<string, unknown>,
    filePath: string
): ArticleFrontmatter {
    const errors: string[] = [];

    // Required string fields
    if (typeof data.title !== 'string' || !data.title) {
        errors.push('title is required and must be a non-empty string');
    }
    if (typeof data.subtitle !== 'string' || !data.subtitle) {
        errors.push('subtitle is required and must be a non-empty string');
    }

    // Validate contentType enum
    const validContentTypes = ['news', 'opinion'];
    if (!validContentTypes.includes(data.contentType as string)) {
        errors.push(`contentType must be one of: ${validContentTypes.join(', ')}`);
    }

    // publishedAt: Handle Date object (from js-yaml) or string
    let publishedAt = data.publishedAt;
    if (publishedAt instanceof Date) {
        publishedAt = publishedAt.toISOString();
    }

    if (typeof publishedAt !== 'string' || !publishedAt) {
        errors.push('publishedAt is required and must be an ISO date string');
    } else {
        const date = new Date(publishedAt);
        if (isNaN(date.getTime())) {
            errors.push('publishedAt must be a valid ISO 8601 date');
        }
    }

    // updatedAt: Handle Date object, string, or null
    let updatedAt = data.updatedAt;
    if (updatedAt instanceof Date) {
        updatedAt = updatedAt.toISOString();
    }

    if (updatedAt !== undefined && updatedAt !== null) {
        if (typeof updatedAt !== 'string') {
            errors.push('updatedAt must be a string or null');
        } else {
            const date = new Date(updatedAt);
            if (isNaN(date.getTime())) {
                errors.push('updatedAt must be a valid ISO 8601 date');
            }
        }
    }

    // Validate arrays
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
        errors.push('tags must be an array of strings');
    }
    if (data.sources !== undefined && !Array.isArray(data.sources)) {
        errors.push('sources must be an array of strings');
    }

    // Validate placement
    const validPlacements = ['lead', 'top', 'standard'];
    if (data.placement !== undefined && typeof data.placement !== 'string') {
        errors.push('placement must be a string');
    } else if (data.placement !== undefined && !validPlacements.includes(data.placement as string)) {
        errors.push(`placement must be one of: ${validPlacements.join(', ')}`);
    }

    // Validate featured boolean (legacy)
    if (data.featured !== undefined && typeof data.featured !== 'boolean') {
        errors.push('featured must be a boolean');
    }

    // Validate optional image URL
    if (data.image !== undefined && typeof data.image !== 'string') {
        errors.push('image must be a string URL');
    }

    // Validate bodyBlocks (Optional, but if present must be array)
    // Detailed validation of blocks structure is done elsewhere or assumed consistent if created by editor
    if (data.bodyBlocks !== undefined && !Array.isArray(data.bodyBlocks)) {
        errors.push('bodyBlocks must be an array of ContentBlock objects');
    }

    if (errors.length > 0) {
        throw new ContentParseError(
            `Frontmatter validation failed:\n  - ${errors.join('\n  - ')}`,
            filePath
        );
    }

    // Map legacy featured to placement
    let placement: 'lead' | 'top' | 'standard' | undefined = data.placement as 'lead' | 'top' | 'standard' | undefined;
    if (!placement && data.featured === true) {
        placement = 'lead';
    }

    return {
        title: data.title as string,
        subtitle: data.subtitle as string,
        contentType: data.contentType as 'news' | 'opinion',
        publishedAt: publishedAt as string,
        updatedAt: (updatedAt as string | null) ?? null,
        placement: placement ?? 'standard',
        image: (data.image as string) ?? undefined,
        tags: (data.tags as string[]) ?? [],
        sources: (data.sources as string[]) ?? [],
        bodyBlocks: (data.bodyBlocks as ContentBlock[]) ?? undefined,
    };
}

/**
 * Parse a Markdown file with YAML frontmatter
 * @param content - Raw file content
 * @param filePath - Path for error messages
 * @returns Parsed article with frontmatter and body
 */
export function parseMarkdown(content: string, filePath: string): ParsedArticle {
    // Handle case where file might be JUST frontmatter (no body)
    // or frontmatter with empty body
    let frontmatterRaw = '';
    let bodyContent = '';

    const match = content.match(FRONTMATTER_REGEX);
    if (match) {
        frontmatterRaw = match[1];
        bodyContent = match[2];
    } else if (content.startsWith('---\n')) {
        // Try to match frontmatter only (no body or empty body)
        const end = content.indexOf('\n---', 4);
        if (end !== -1) {
            frontmatterRaw = content.substring(4, end);
            bodyContent = content.substring(end + 4).trim();
        } else {
            // Fallback to strict regex check if fuzzy match fails
            if (!match) {
                throw new ContentParseError(
                    'Invalid Markdown format: Missing or malformed frontmatter. Expected format:\n---\nkey: value\n---\nBody content',
                    filePath
                );
            }
        }
    } else {
        throw new ContentParseError(
            'Invalid Markdown format: Missing or malformed frontmatter. Expected format:\n---\nkey: value\n---\nBody content',
            filePath
        );
    }

    let parsedYaml: Record<string, unknown>;
    try {
        parsedYaml = yaml.load(frontmatterRaw) as Record<string, unknown>;
    } catch (e) {
        throw new ContentParseError(
            `Invalid YAML in frontmatter: ${(e as Error).message}`,
            filePath
        );
    }

    const frontmatter = validateFrontmatter(parsedYaml, filePath);

    return {
        frontmatter,
        body: bodyContent ? bodyContent.trim() : '',
    };
}
