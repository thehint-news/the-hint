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
import { PostBlockRenderer } from './PostBlock';
import { SocialEmbed } from './SocialEmbed';
import { detectOEmbedPlatform } from '@/lib/content/oembed';
import {
    isImageBlock,
    isVideoBlock,
    isPostBlock,
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
                    prose-blockquote:border-l-4 prose-blockquote:border-[#111] prose-blockquote:px-6 prose-blockquote:py-5 prose-blockquote:bg-[#f4f5f7] prose-blockquote:rounded-md prose-blockquote:shadow-inner prose-blockquote:text-[#1a1a1a]
                    [&>blockquote>p]:italic [&>blockquote>p]:font-bold">

                {blocks.map((block) => {
                    // Image Block - Display all body images
                    if (isImageBlock(block)) {
                        return (
                            <div key={block.id} className="not-prose">
                                <ImageBlockRenderer
                                    block={block}
                                    isAboveFold={false}
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

                    // Post Block — Social embed card
                    if (isPostBlock(block)) {
                        return (
                            <div key={block.id} className="not-prose">
                                <PostBlockRenderer block={block} />
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
                                    fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                                    lineHeight: 1.45,
                                    marginTop: '2.5rem',
                                    marginBottom: '1.25rem',
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
                                    borderLeft: '4px solid #111111',
                                    paddingLeft: '1.5rem',
                                    paddingRight: '1.5rem',
                                    paddingTop: '1.25rem',
                                    paddingBottom: '1.25rem',
                                    backgroundColor: '#f4f5f7',
                                    borderRadius: '6px',
                                    boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.04)',
                                    marginTop: '2.5rem',
                                    marginBottom: '2.5rem',
                                    marginLeft: 0,
                                    marginRight: 0,
                                }}
                            >
                                <p style={{
                                    fontStyle: 'italic',
                                    fontWeight: 700,
                                    fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
                                    lineHeight: 1.65,
                                    color: '#1a1a1a',
                                    fontFamily: 'var(--font-serif-full)',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    &ldquo;{block.content}&rdquo;
                                </p>
                                {block.attribution && (
                                    <footer style={{
                                        marginTop: '1rem',
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

                    // Check if the paragraph is actually just a single oEmbed URL
                    // or an entire pasted HTML blockquote containing an oEmbed URL.
                    const blockContentTrimmed = block.content.trim();
                    let isOEmbedUrl = false;
                    let embedUrl = blockContentTrimmed;

                    if (/^(https?:\/\/[^\s]+)$/.test(blockContentTrimmed) && detectOEmbedPlatform(blockContentTrimmed)) {
                        isOEmbedUrl = true;
                    } else if (blockContentTrimmed.startsWith('<') && (blockContentTrimmed.includes('<blockquote') || blockContentTrimmed.includes('<iframe') || blockContentTrimmed.includes('<div'))) {
                        // Users often paste the full embed code rather than just the URL.
                        // We extract the final canonical URL which is usually placed at the end of the markup.
                        const urls = blockContentTrimmed.match(/https?:\/\/[^\s<"']+/g) || [];
                        const lastUrl = urls[urls.length - 1];
                        if (lastUrl && detectOEmbedPlatform(lastUrl)) {
                            isOEmbedUrl = true;
                            embedUrl = lastUrl;
                        }
                    }

                    if (isOEmbedUrl) {
                        return (
                            <figure key={block.id} className="not-prose" style={{ margin: '2rem auto', width: '100%', maxWidth: '600px' }}>
                                <SocialEmbed url={embedUrl} />
                            </figure>
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
                                    fontSize: 'clamp(1.0625rem, 2.5vw, 1.125rem)',
                                    lineHeight: 1.8,
                                    color: '#111111',
                                    marginBottom: '1.75rem',
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
