/**
 * Media Validation Tests
 * Unit tests for media block validation
 */

import { describe, it, expect } from 'vitest';
import {
    validateMediaBlocks,
    validateImageFile,
    parseVideoUrl,
    canInsertMediaAt,
} from '../media';

import {
    ContentBlock,
    ParagraphBlock,
    ImageBlock,
    VideoBlock,
    createParagraphBlock,
    createImageBlock,
    createVideoBlock,
    MEDIA_LIMITS,
} from '../../content/media-types';

// =============================================================================
// HELPER FACTORIES
// =============================================================================

function makeParagraph(order: number): ParagraphBlock {
    return createParagraphBlock('Test paragraph content', order);
}

function makeImage(order: number, alt = 'Test alt text'): ImageBlock {
    return createImageBlock(order, {
        src: '/media/images/test.jpg',
        alt,
        width: 1200,
        height: 800,
        aspectRatio: '3:2',
    });
}

function makeVideo(order: number): VideoBlock {
    return createVideoBlock(order, {
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        posterUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    });
}

// =============================================================================
// validateMediaBlocks TESTS
// =============================================================================

describe('validateMediaBlocks', () => {
    describe('block ordering rules', () => {
        it('should pass with text-only blocks', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeParagraph(1),
                makeParagraph(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should pass with valid text-image-text sequence', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeParagraph(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(true);
        });

        it('should fail when article starts with media', () => {
            const blocks: ContentBlock[] = [
                makeImage(0),
                makeParagraph(1),
                makeParagraph(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'article_starts_with_media')).toBe(true);
        });

        it('should fail when article ends with media', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeParagraph(1),
                makeImage(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'article_ends_with_media')).toBe(true);
        });

        it('should fail with consecutive media blocks', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeImage(2),
                makeParagraph(3),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'consecutive_media_blocks')).toBe(true);
        });

        it('should pass with interleaved media and text', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeParagraph(2),
                makeVideo(3),
                makeParagraph(4),
                makeImage(5),
                makeParagraph(6),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(true);
        });
    });

    describe('media limits', () => {
        it('should fail when image limit exceeded (4 images)', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeParagraph(2),
                makeImage(3),
                makeParagraph(4),
                makeImage(5),
                makeParagraph(6),
                makeImage(7), // 4th image - exceeds limit
                makeParagraph(8),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'image_limit_exceeded')).toBe(true);
        });

        it('should pass with exactly 3 images (at limit)', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeParagraph(2),
                makeImage(3),
                makeParagraph(4),
                makeImage(5),
                makeParagraph(6),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(true);
        });

        it('should warn (not error) for video soft limit', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeVideo(1),
                makeParagraph(2),
                makeVideo(3), // 2nd video - soft limit
                makeParagraph(4),
            ];

            const result = validateMediaBlocks(blocks);
            // Should still be valid (soft limit)
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.type === 'video_soft_limit')).toBe(true);
        });
    });

    describe('image block validation', () => {
        it('should fail when alt text is missing', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1, ''), // Empty alt
                makeParagraph(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'empty_alt_text')).toBe(true);
        });

        it('should warn when caption is missing', () => {
            const blocks: ContentBlock[] = [
                makeParagraph(0),
                makeImage(1),
                makeParagraph(2),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.warnings.some(w => w.type === 'missing_caption')).toBe(true);
        });
    });

    describe('empty blocks', () => {
        it('should fail with empty blocks array', () => {
            const blocks: ContentBlock[] = [];
            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'empty_blocks')).toBe(true);
        });

        it('should fail with media-only article', () => {
            const blocks: ContentBlock[] = [
                makeImage(0),
            ];

            const result = validateMediaBlocks(blocks);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === 'media_only_article')).toBe(true);
        });
    });
});

// =============================================================================
// parseVideoUrl TESTS
// =============================================================================

describe('parseVideoUrl', () => {
    describe('YouTube URLs', () => {
        it('should parse standard YouTube watch URL', () => {
            const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('youtube');
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });

        it('should parse short youtu.be URL', () => {
            const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('youtube');
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });

        it('should parse embed URL', () => {
            const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('youtube');
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });

        it('should parse shorts URL', () => {
            const result = parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('youtube');
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });
    });

    describe('Vimeo URLs', () => {
        it('should parse standard Vimeo URL', () => {
            const result = parseVideoUrl('https://vimeo.com/123456789');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('vimeo');
            expect(result.videoId).toBe('123456789');
        });

        it('should parse player Vimeo URL', () => {
            const result = parseVideoUrl('https://player.vimeo.com/video/123456789');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('vimeo');
            expect(result.videoId).toBe('123456789');
        });
    });

    describe('CDN/direct URLs', () => {
        it('should parse mp4 URL', () => {
            const result = parseVideoUrl('https://cdn.example.com/video.mp4');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('cdn');
        });

        it('should parse webm URL', () => {
            const result = parseVideoUrl('https://cdn.example.com/video.webm');
            expect(result.valid).toBe(true);
            expect(result.provider).toBe('cdn');
        });
    });

    describe('invalid URLs', () => {
        it('should reject empty URL', () => {
            const result = parseVideoUrl('');
            expect(result.valid).toBe(false);
        });

        it('should reject unsupported URL', () => {
            const result = parseVideoUrl('https://example.com/video');
            expect(result.valid).toBe(false);
        });
    });
});

// =============================================================================
// validateImageFile TESTS
// =============================================================================

describe('validateImageFile', () => {
    it('should pass for valid JPEG', () => {
        const result = validateImageFile({
            size: 1024 * 1024, // 1MB
            type: 'image/jpeg',
            name: 'test.jpg',
        });
        expect(result.isValid).toBe(true);
    });

    it('should pass for valid WebP', () => {
        const result = validateImageFile({
            size: 1024 * 1024,
            type: 'image/webp',
            name: 'test.webp',
        });
        expect(result.isValid).toBe(true);
    });

    it('should fail for oversized file', () => {
        const result = validateImageFile({
            size: 10 * 1024 * 1024, // 10MB
            type: 'image/jpeg',
            name: 'huge.jpg',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.type === 'image_too_large')).toBe(true);
    });

    it('should fail for unsupported format', () => {
        const result = validateImageFile({
            size: 1024 * 1024,
            type: 'image/gif',
            name: 'animated.gif',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.type === 'invalid_image_format')).toBe(true);
    });
});

// =============================================================================
// canInsertMediaAt TESTS
// =============================================================================

describe('canInsertMediaAt', () => {
    it('should allow insertion at position 0', () => {
        const blocks: ContentBlock[] = [makeParagraph(0), makeParagraph(1)];
        const result = canInsertMediaAt(blocks, 0, 'image');
        expect(result.valid).toBe(true);
    });

    it('should allow insertion at end', () => {
        const blocks: ContentBlock[] = [makeParagraph(0), makeParagraph(1)];
        const result = canInsertMediaAt(blocks, 2, 'image');
        expect(result.valid).toBe(true);
    });

    it('should allow insertion next to media', () => {
        const blocks: ContentBlock[] = [
            makeParagraph(0),
            makeImage(1),
            makeParagraph(2),
        ];
        // Position 1 would be adjacent to image at position 1
        const result = canInsertMediaAt(blocks, 2, 'image');
        expect(result.valid).toBe(true);
    });

    it('should allow insertion between text blocks', () => {
        const blocks: ContentBlock[] = [
            makeParagraph(0),
            makeParagraph(1),
            makeParagraph(2),
        ];
        const result = canInsertMediaAt(blocks, 1, 'image');
        expect(result.valid).toBe(true);
    });

    it('should reject when image limit reached', () => {
        const blocks: ContentBlock[] = [
            makeParagraph(0),
            makeImage(1),
            makeParagraph(2),
            makeImage(3),
            makeParagraph(4),
            makeImage(5),
            makeParagraph(6),
            makeParagraph(7),
        ];
        const result = canInsertMediaAt(blocks, 7, 'image');
        expect(result.valid).toBe(false);
    });
});
