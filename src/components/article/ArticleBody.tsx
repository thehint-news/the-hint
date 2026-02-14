/**
 * ArticleBody Component
 * 
 * Renders the main article content from Markdown.
 * Optimized for long-form reading with clean typography.
 * 
 * All images display at their full original size and aspect ratio.
 * NOTE: Thumbnail is separate from body images - they don't interact.
 */

import { marked } from 'marked';
import { parseBodyToBlocks } from '@/lib/content/block-parser';
import { ImageBlockRenderer } from './ImageBlock';
import { VideoBlockRenderer } from './VideoBlock';
import {
    isImageBlock,
    isVideoBlock,
    isSubheadingBlock,
    isQuoteBlock
} from '@/lib/content/media-types';

interface ArticleBodyProps {
    content: string;
}

export function ArticleBody({ content }: ArticleBodyProps) {
    // Parse content into blocks
    const { blocks } = parseBodyToBlocks(content);

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
                                    fontFamily: 'var(--font-serif)'
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
                                    fontFamily: 'var(--font-serif)',
                                    margin: 0,
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

                    // Paragraph (Default) - Styled for optimal reading
                    const htmlContent = marked.parse(block.content, {
                        async: false,
                        gfm: true,
                        breaks: false,
                    }) as string;

                    return (
                        <div
                            key={block.id}
                            style={{
                                fontFamily: 'var(--font-serif)',
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
