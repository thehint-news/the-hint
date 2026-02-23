/**
 * Block Parser
 * Parses article body content into structured blocks
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * Block Syntax in Markdown:
 * 
 * Text blocks:
 *   - Paragraphs: Regular text separated by blank lines
 *   - Subheadings: Lines starting with ## 
 *   - Quotes: Lines wrapped in > or using :::quote fence
 * 
 * Media blocks (fenced):
 *   :::image
 *   src: /media/images/photo.webp
 *   alt: Description here
 *   caption: Optional caption
 *   credit: Photographer name
 *   width: 1200
 *   height: 800
 *   :::
 * 
 *   :::video
 *   provider: youtube
 *   videoId: dQw4w9WgXcQ
 *   posterUrl: /media/posters/thumb.webp
 *   caption: Video description
 *   :::
 */

import {
    ContentBlock,
    ParagraphBlock,
    SubheadingBlock,
    QuoteBlock,
    ImageBlock,
    VideoBlock,
    PostBlock,
    PostPlatform,
    ImageAspectRatio,
    VideoSourceType,
    SocialVideoProvider,
    generateBlockId,
    reorderBlocks,
} from './media-types';

// =============================================================================
// PARSER TYPES
// =============================================================================

/** Result of parsing body content */
export interface BlockParseResult {
    /** Successfully parsed blocks */
    blocks: ContentBlock[];
    /** Whether parsing was successful */
    success: boolean;
    /** Parse errors (if any) */
    errors: BlockParseError[];
    /** Whether this is legacy (non-block) content */
    isLegacy: boolean;
}

/** A parsing error */
export interface BlockParseError {
    /** Line number where error occurred */
    line: number;
    /** Error message */
    message: string;
    /** The problematic content */
    content?: string;
}

/** Parsed fence block (image, video, or post) */
interface ParsedFence {
    type: 'image' | 'video' | 'post';
    properties: Record<string, string>;
    startLine: number;
    endLine: number;
}

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/** Check if content uses block syntax */
export function isBlockBasedContent(body: string): boolean {
    // Check for fenced media blocks
    return /^:::(?:image|video|post)\s*$/m.test(body);
}

/** Check if content is legacy (plain markdown) */
export function isLegacyContent(body: string): boolean {
    return !isBlockBasedContent(body);
}

// =============================================================================
// MAIN PARSER
// =============================================================================

/**
 * Parse article body into content blocks
 * 
 * @param body - Raw markdown body content
 * @returns Parse result with blocks or errors
 */
export function parseBodyToBlocks(body: string): BlockParseResult {
    const errors: BlockParseError[] = [];

    // Handle empty body
    if (!body || body.trim() === '') {
        return {
            blocks: [],
            success: true,
            errors: [],
            isLegacy: false,
        };
    }

    // Always use the robust block parser for all content.
    // It handles standard markdown (paragraphs, headings, quotes) correctly
    // and supports fences if present. This ensures consistent multi-line behavior.
    try {
        const blocks = parseBlockContent(body, errors);
        return {
            blocks: reorderBlocks(blocks),
            success: errors.length === 0,
            errors,
            isLegacy: isLegacyContent(body),
        };
    } catch (error) {
        errors.push({
            line: 0,
            message: error instanceof Error ? error.message : 'Unknown parsing error',
        });
        return {
            blocks: [],
            success: false,
            errors,
            isLegacy: false,
        };
    }
}


// =============================================================================
// BLOCK CONTENT PARSER
// =============================================================================

/**
 * Parse block-based markdown content
 */
function parseBlockContent(body: string, errors: BlockParseError[]): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const lines = body.split('\n');
    let order = 0;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip empty lines between blocks
        if (trimmedLine === '') {
            i++;
            continue;
        }

        // Fenced media block start
        if (/^:::(?:image|video|post)\s*$/.test(trimmedLine)) {
            const fence = parseFenceBlock(lines, i, errors);
            if (fence) {
                if (fence.type === 'image') {
                    const imageBlock = createImageBlockFromFence(fence, order++, errors);
                    if (imageBlock) {
                        blocks.push(imageBlock);
                    }
                } else if (fence.type === 'video') {
                    const videoBlock = createVideoBlockFromFence(fence, order++, errors);
                    if (videoBlock) {
                        blocks.push(videoBlock);
                    }
                } else if (fence.type === 'post') {
                    const postBlock = createPostBlockFromFence(fence, order++, errors);
                    if (postBlock) {
                        blocks.push(postBlock);
                    }
                }
                i = fence.endLine + 1;
                continue;
            }
        }

        // Quote fence
        if (trimmedLine === ':::quote') {
            const quote = parseQuoteFence(lines, i, errors);
            if (quote) {
                blocks.push(quote.block);
                order++;
                i = quote.endLine + 1;
                continue;
            }
        }

        // Subheading (## or ###)
        if (/^#{2,3}\s+/.test(trimmedLine)) {
            const headingLines: string[] = [];
            headingLines.push(trimmedLine.replace(/^#{2,3}\s+/, ''));
            i++;

            // Allow subheading to span multiple lines if they are not empty and not another block type
            while (i < lines.length) {
                const nextLine = lines[i];
                const nextTrimmed = nextLine.trim();

                if (
                    nextTrimmed === '' ||
                    nextTrimmed.startsWith(':::') ||
                    /^#{2,3}\s+/.test(nextTrimmed) ||
                    /^>\s*/.test(nextTrimmed)
                ) {
                    break;
                }

                headingLines.push(nextTrimmed);
                i++;
            }

            blocks.push({
                id: generateBlockId('subheading'),
                type: 'subheading',
                order: order++,
                content: headingLines.join('\n'),
            } as SubheadingBlock);
            continue;
        }

        // Quote (> prefix) - Multi-line supported
        if (/^>\s*/.test(trimmedLine)) {
            const quoteLines: string[] = [];
            // Consume consecutive lines starting with >
            while (i < lines.length) {
                const quoteLine = lines[i].trim();
                if (/^>\s*/.test(quoteLine)) {
                    quoteLines.push(quoteLine.replace(/^>\s*/, ''));
                    i++;
                } else {
                    break;
                }
            }

            if (quoteLines.length > 0) {
                const fullContent = quoteLines.join('\n');
                // Check for inline attribution in the merged content? 
                // For robustness, we mostly treat this as content.
                // Simple regex check on the LAST line for attribution might be nice, 
                // but let's stick to simple content merging to fix the split block issue first.

                blocks.push({
                    id: generateBlockId('quote'),
                    type: 'quote',
                    order: order++,
                    content: fullContent,
                } as QuoteBlock);
            }
            continue;
        }

        // Regular paragraph - collect until empty line or fence
        const paragraph = collectParagraph(lines, i);
        if (paragraph.content.trim()) {
            blocks.push({
                id: generateBlockId('paragraph'),
                type: 'paragraph',
                order: order++,
                content: paragraph.content,
            } as ParagraphBlock);
        }
        i = paragraph.endLine + 1;
    }

    return blocks;
}

// =============================================================================
// FENCE PARSERS
// =============================================================================

/**
 * Parse a fenced media block (:::image or :::video)
 */
function parseFenceBlock(
    lines: string[],
    startLine: number,
    errors: BlockParseError[]
): ParsedFence | null {
    const openLine = lines[startLine].trim();
    const typeMatch = openLine.match(/^:::(image|video|post)\s*$/);

    if (!typeMatch) {
        errors.push({
            line: startLine + 1,
            message: 'Invalid fence opening',
            content: openLine,
        });
        return null;
    }

    const type = typeMatch[1] as 'image' | 'video' | 'post';
    const properties: Record<string, string> = {};
    let endLine = startLine;

    // Parse properties until closing :::
    for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Closing fence
        if (line === ':::') {
            endLine = i;
            return { type, properties, startLine, endLine };
        }

        // Property line (key: value)
        const propMatch = line.match(/^(\w+):\s*(.*)$/);
        if (propMatch) {
            properties[propMatch[1]] = propMatch[2].trim();
        } else if (line !== '') {
            errors.push({
                line: i + 1,
                message: `Invalid property format in ${type} block`,
                content: line,
            });
        }
    }

    // Unclosed fence
    errors.push({
        line: startLine + 1,
        message: `Unclosed ${type} fence block`,
    });
    return null;
}

/**
 * Parse a quote fence block
 */
function parseQuoteFence(
    lines: string[],
    startLine: number,
    errors: BlockParseError[]
): { block: QuoteBlock; endLine: number } | null {
    const contentLines: string[] = [];
    let attribution: string | undefined;
    let endLine = startLine;

    for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === ':::') {
            endLine = i;
            break;
        }

        // Check for attribution line
        if (line.startsWith('attribution:')) {
            attribution = line.replace('attribution:', '').trim();
        } else {
            contentLines.push(line);
        }
    }

    if (endLine === startLine) {
        errors.push({
            line: startLine + 1,
            message: 'Unclosed quote fence block',
        });
        return null;
    }

    return {
        block: {
            id: generateBlockId('quote'),
            type: 'quote',
            order: 0, // Will be set by caller
            content: contentLines.join('\n'),
            attribution,
        },
        endLine,
    };
}

/**
 * Collect paragraph lines until empty line or fence
 * Consumes consecutive non-empty lines as a single paragraph block
 */
function collectParagraph(
    lines: string[],
    startLine: number
): { content: string; endLine: number } {
    const paragraphLines: string[] = [];
    let endLine = startLine;

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Stop at empty line - this signals end of paragraph block
        if (trimmedLine === '') {
            endLine = i;
            break;
        }

        // Stop at fence or heading or quote
        if (
            trimmedLine.startsWith(':::') ||
            /^#{2,3}\s+/.test(trimmedLine) ||
            /^>\s*/.test(trimmedLine)
        ) {
            endLine = i - 1;
            break;
        }

        paragraphLines.push(line);
        endLine = i;
    }

    return {
        content: paragraphLines.join('\n').trim(), // Join with newline to preserve formatting within block
        endLine,
    };
}

// =============================================================================
// BLOCK CREATORS FROM FENCE
// =============================================================================

/**
 * Create ImageBlock from parsed fence properties
 */
function createImageBlockFromFence(
    fence: ParsedFence,
    order: number,
    errors: BlockParseError[]
): ImageBlock | null {
    const { properties, startLine } = fence;

    // Required properties
    if (!properties.src) {
        errors.push({
            line: startLine + 1,
            message: 'Image block missing required "src" property',
        });
        return null;
    }

    if (!properties.alt) {
        errors.push({
            line: startLine + 1,
            message: 'Image block missing required "alt" property',
        });
        return null;
    }

    const width = parseInt(properties.width, 10);
    const height = parseInt(properties.height, 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        errors.push({
            line: startLine + 1,
            message: 'Image block requires valid "width" and "height" properties',
        });
        return null;
    }

    // Determine aspect ratio
    const aspectRatio = calculateAspectRatio(width, height);

    return {
        id: generateBlockId('image'),
        type: 'image',
        order,
        src: properties.src,
        alt: properties.alt,
        caption: properties.caption,
        credit: properties.credit,
        width,
        height,
        aspectRatio,
        srcset: properties.srcset,
    };
}

/**
 * Create VideoBlock from parsed fence properties
 */
/**
 * Create VideoBlock from parsed fence properties
 */
function createVideoBlockFromFence(
    fence: ParsedFence,
    order: number,
    errors: BlockParseError[]
): VideoBlock | null {
    const { properties, startLine } = fence;

    // Legacy migration: If provider exists but sourceType doesn't
    let sourceType = properties.sourceType as VideoSourceType;
    if (!sourceType && properties.provider) {
        if (['cdn', 'file'].includes(properties.provider)) {
            sourceType = 'cdn';
        } else {
            sourceType = 'social';
        }
    }

    if (!sourceType && properties.originalUrl) {
        // Infer from extension if possible, or default to social if not file
        if (/\.(mp4|webm|mkv)$/i.test(properties.originalUrl)) {
            sourceType = 'cdn'; // Normalize file extensions to cdn for consistent handling
        } else {
            sourceType = 'social';
        }
    }

    // Default if still unknown (should not happen in valid blocks)
    if (!sourceType) {
        errors.push({
            line: startLine + 1,
            message: 'Video block missing required "sourceType" or legacy "provider"',
        });
        return null; // Strict validation for new blocks
    }

    // REQUIRED: originalUrl (or construct from videoId for legacy)
    let originalUrl = properties.originalUrl;
    if (!originalUrl && properties.videoId && properties.provider) {
        // Construct legacy URL
        if (properties.provider === 'youtube') originalUrl = `https://youtube.com/watch?v=${properties.videoId}`;
        else if (properties.provider === 'vimeo') originalUrl = `https://vimeo.com/${properties.videoId}`;
        else originalUrl = properties.videoId; // CDN or others
    }

    if (!originalUrl) {
        errors.push({
            line: startLine + 1,
            message: 'Video block missing required "originalUrl"',
        });
        return null;
    }

    // REQUIRED: posterThumbnail (legacy: posterUrl)
    const posterThumbnail = properties.posterThumbnail || properties.posterUrl;
    if (!posterThumbnail && sourceType !== 'social') {
        errors.push({
            line: startLine + 1,
            message: 'Video block missing required "posterThumbnail" for non-social video source',
        });
        // We allow it to continue to prevent total parse failure, but it is invalid
    }

    // REQUIRED: caption
    if (!properties.caption) {
        errors.push({
            line: startLine + 1,
            message: 'Video block missing required "caption"',
        });
        return null;
    }

    return {
        id: generateBlockId('video'),
        type: 'video',
        order,
        sourceType,
        originalUrl,
        posterThumbnail: posterThumbnail || '',
        embedUrl: properties.embedUrl,
        caption: properties.caption,
        credit: properties.credit,
        provider: properties.provider as SocialVideoProvider,
        mimeType: properties.mimeType,
        duration: properties.duration ? parseInt(properties.duration, 10) : undefined,
        title: properties.title,
        trustedSourceHtml: properties.trustedSourceHtml,
    };
}

/**
 * Create PostBlock from parsed fence properties
 */
function createPostBlockFromFence(
    fence: ParsedFence,
    order: number,
    errors: BlockParseError[]
): PostBlock | null {
    const { properties, startLine } = fence;

    // Required: originalUrl
    if (!properties.originalUrl) {
        errors.push({
            line: startLine + 1,
            message: 'Post block missing required "originalUrl" property',
        });
        return null;
    }

    // Required: canonicalUrl
    if (!properties.canonicalUrl) {
        errors.push({
            line: startLine + 1,
            message: 'Post block missing required "canonicalUrl" property',
        });
        return null;
    }

    // Required: platform
    if (!properties.platform) {
        errors.push({
            line: startLine + 1,
            message: 'Post block missing required "platform" property',
        });
        return null;
    }

    return {
        id: generateBlockId('post'),
        type: 'post',
        order,
        originalUrl: properties.originalUrl,
        canonicalUrl: properties.canonicalUrl,
        platform: properties.platform as PostPlatform,
        metadata: {
            author: properties['metadata.author'] || '',
            username: properties['metadata.username'] || '',
            avatar: properties['metadata.avatar'] || undefined,
            textPreview: properties['metadata.textPreview'] || '',
            thumbnail: properties['metadata.thumbnail'] || undefined,
            timestamp: properties['metadata.timestamp'] || undefined,
            verified: properties['metadata.verified'] === 'true',
        },
    };
}

// =============================================================================
// SERIALIZATION (Blocks to Markdown)
// =============================================================================

/**
 * Serialize content blocks back to markdown format
 */
export function serializeBlocksToMarkdown(blocks: ContentBlock[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
        switch (block.type) {
            case 'paragraph':
                lines.push(block.content);
                lines.push('');
                break;

            case 'subheading':
                lines.push(`## ${block.content}`);
                lines.push('');
                break;

            case 'quote':
                if (block.attribution) {
                    lines.push(':::quote');
                    lines.push(block.content);
                    lines.push(`attribution: ${block.attribution}`);
                    lines.push(':::');
                } else {
                    // Start every line with > for robust parsing
                    const quoteLines = block.content.split('\n').map(l => `> ${l}`).join('\n');
                    lines.push(quoteLines);
                }
                lines.push('');
                break;

            case 'image':
                lines.push(':::image');
                lines.push(`src: ${block.src}`);
                lines.push(`alt: ${block.alt}`);
                lines.push(`width: ${block.width}`);
                lines.push(`height: ${block.height}`);
                if (block.caption) lines.push(`caption: ${block.caption}`);
                if (block.credit) lines.push(`credit: ${block.credit}`);
                if (block.srcset) lines.push(`srcset: ${block.srcset}`);
                lines.push(':::');
                lines.push('');
                break;

            case 'video':
                lines.push(`:::video`);
                lines.push(`sourceType: ${block.sourceType}`);
                if (block.originalUrl) lines.push(`originalUrl: ${block.originalUrl}`);
                if (block.caption) lines.push(`caption: ${block.caption}`);
                if (block.posterThumbnail) lines.push(`posterThumbnail: ${block.posterThumbnail}`);
                if (block.embedUrl) lines.push(`embedUrl: ${block.embedUrl}`);
                if (block.provider) lines.push(`provider: ${block.provider}`);
                if (block.credit) lines.push(`credit: ${block.credit}`);
                if (block.title) lines.push(`title: ${block.title}`);
                if (block.trustedSourceHtml) lines.push(`trustedSourceHtml: ${block.trustedSourceHtml}`);
                lines.push(`:::`);
                break;

            case 'post':
                lines.push(':::post');
                lines.push(`originalUrl: ${block.originalUrl}`);
                lines.push(`canonicalUrl: ${block.canonicalUrl}`);
                lines.push(`platform: ${block.platform}`);
                lines.push(`metadata.author: ${block.metadata.author}`);
                lines.push(`metadata.username: ${block.metadata.username}`);
                if (block.metadata.avatar) lines.push(`metadata.avatar: ${block.metadata.avatar}`);
                lines.push(`metadata.textPreview: ${block.metadata.textPreview}`);
                if (block.metadata.thumbnail) lines.push(`metadata.thumbnail: ${block.metadata.thumbnail}`);
                if (block.metadata.timestamp) lines.push(`metadata.timestamp: ${block.metadata.timestamp}`);
                if (block.metadata.verified) lines.push(`metadata.verified: true`);
                lines.push(':::');
                lines.push('');
                break;
        }
    }

    return lines.join('\n').trim();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate aspect ratio from dimensions
 */
function calculateAspectRatio(width: number, height: number): ImageAspectRatio {
    const ratio = width / height;

    // Match to standard ratios (with tolerance)
    if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3 / 2) < 0.1) return '3:2';
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 2 / 3) < 0.1) return '2:3';
    if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';

    return 'original';
}

// =============================================================================
// EXPORTS FOR CONTENT MODULE
// =============================================================================

export type {
    ContentBlock,
    ParagraphBlock,
    SubheadingBlock,
    QuoteBlock,
    ImageBlock,
    VideoBlock,
    PostBlock,
} from './media-types';
