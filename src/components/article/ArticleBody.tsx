/**
 * ArticleBody Component
 * 
 * Renders article content from structured blocks (canonical) or legacy Markdown.
 * 
 * BLOCK RENDERING RULES:
 * - When bodyBlocks exist, render directly — NO markdown parsing
 * - white-space: pre-wrap preserves all spacing and line breaks
 * - Legacy markdown fallback only for old articles without bodyBlocks
 */
import { marked } from 'marked'; // Only used for legacy articles without bodyBlocks
import { parseBodyToBlocks } from '@/lib/content/block-parser';
import { ImageBlockRenderer } from './ImageBlock';
import { VideoBlockRenderer } from './VideoBlock';
import {
    isImageBlock,
    isVideoBlock,
    isSubheadingBlock,
    isQuoteBlock,
    ContentBlock
} from '@/lib/content/media-types';

interface ArticleBodyProps {
    content?: string;
    blocks?: ContentBlock[]; // Canonical source
}

export function ArticleBody({ content, blocks: providedBlocks }: ArticleBodyProps) {
    // USE BLOCKS DIRECTLY if available (Canonical)
    // Fallback to legacy parser if only content string exists
    const blocks = providedBlocks || (content ? parseBodyToBlocks(content).blocks : []);

    return (
        <div className="mb-12">
            <div className="prose prose-lg max-w-[680px] mx-auto font-serif
                    prose-headings:font-bold prose-headings:leading-tight prose-headings:font-sans
                    prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
                    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                    prose-p:text-[1.125rem] prose-p:leading-[1.75] prose-p:mb-6 prose-p:text-[#111]
                    prose-a:no-underline prose-a:border-b prose-a:border-[#D9D9D9] prose-a:transition-colors prose-a:hover:border-[#111] prose-a:hover:text-[#000]
                    prose-ul:my-6 prose-ul:pl-6
                    prose-li:text-lg prose-li:leading-relaxed prose-li:mb-2
                    prose-strong:font-bold
                    prose-img:block prose-img:w-full prose-img:mx-auto prose-img:my-8 prose-img:rounded-sm
                    prose-blockquote:border-l-2 prose-blockquote:border-[#111] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[#444]">

                {blocks.map((block, index) => {
                    // Image Block - Display all body images
                    if (isImageBlock(block)) {
                        return (
                            <div key={block.id} className="not-prose">
                                <ImageBlockRenderer
                                    block={block}
                                    isAboveFold={index < 2}
                                />
                            </div>
                        );
                    }

                    // Video Block
                    if (isVideoBlock(block)) {
                        return (
                            <div key={block.id} className="not-prose">
                                <VideoBlockRenderer block={block} />
                            </div>
                        );
                    }

                    // Subheading - Bold, black text for clear visual hierarchy
                    if (isSubheadingBlock(block)) {
                        return (
                            <h2
                                key={block.id}
                                style={{
                                    fontWeight: 700,
                                    color: '#111111',
                                    fontSize: '1.5rem',
                                    lineHeight: 1.3,
                                    marginTop: '2.5rem',
                                    marginBottom: '1rem',
                                    fontFamily: 'var(--font-serif-full)',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {block.content}
                            </h2>
                        );
                    }

                    // Quote - Styled for editorial emphasis
                    if (isQuoteBlock(block)) {
                        return (
                            <blockquote
                                key={block.id}
                                style={{
                                    borderLeft: '3px solid #111111',
                                    paddingLeft: '1.5rem',
                                    marginTop: '2rem',
                                    marginBottom: '2rem',
                                    marginLeft: 0,
                                    marginRight: 0,
                                }}
                            >
                                <p style={{
                                    fontStyle: 'italic',
                                    fontSize: '1.25rem',
                                    lineHeight: 1.6,
                                    color: '#2B2B2B',
                                    fontFamily: 'var(--font-serif-full)',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    &ldquo;{block.content}&rdquo;
                                </p>
                                {block.attribution && (
                                    <footer style={{
                                        marginTop: '0.75rem',
                                        fontSize: '0.875rem',
                                        color: '#595959',
                                        fontStyle: 'normal',
                                        fontWeight: 500,
                                    }}>
                                        — {block.attribution}
                                    </footer>
                                )}
                            </blockquote>
                        );
                    }

                    // Paragraph (Default)
                    // ZERO TRANSFORMATION: Render raw content with pre-wrap.
                    // If bodyBlocks exist (canonical), do NOT parse markdown.
                    // Only use markdown for legacy articles where blocks were reconstructed.
                    if (providedBlocks && providedBlocks.length > 0) {
                        // CANONICAL: Direct rendering, no markdown parsing
                        return (
                            <p
                                key={block.id}
                                style={{
                                    fontFamily: 'var(--font-serif-full)',
                                    fontSize: '1.125rem',
                                    lineHeight: 1.75,
                                    color: '#111111',
                                    marginBottom: '1.5rem',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {block.content}
                            </p>
                        );
                    }

                    // LEGACY FALLBACK: Parse markdown only for old articles without bodyBlocks
                    const htmlContent = marked.parse(block.content, {
                        async: false,
                        gfm: true,
                        breaks: true,
                    }) as string;

                    return (
                        <div
                            key={block.id}
                            style={{
                                fontFamily: 'var(--font-serif-full)',
                                fontSize: '1.125rem',
                                lineHeight: 1.75,
                                color: '#111111',
                                marginBottom: '1.5rem',
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
