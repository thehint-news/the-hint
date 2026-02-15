/**
 * StoryList Component
 * 
 * Renders a list of stories for section pages.
 * Uses the global thumbnail system and editorial design tokens.
 * 
 * Layout:
 * - Default (politics, world-affairs): Horizontal cards with 3:2 thumbnails
 * - Compact (crime, court): Dense wire-style rows with small thumbnails
 * - Opinion: Card-grid with author treatment
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from 'next/link';
import Image from 'next/image';
import { formatSafeDate } from '@/lib/utils';

interface StoryListArticle {
    id: string;
    title: string;
    subtitle: string;
    publishedAt: string;
    contentType: string;
    section: string;
    image?: string;
}

interface StoryListProps {
    /** Array of articles to display */
    articles: StoryListArticle[];
    /** Section slug for styling variants */
    sectionSlug: string;
}

export function StoryList({ articles, sectionSlug }: StoryListProps) {
    if (articles.length === 0) {
        return (
            <div className="py-12 text-center border-t border-[#111]">
                <p className="font-serif text-lg italic text-[#8A8A8A]">
                    No stories available in this section.
                </p>
            </div>
        );
    }

    // layout variants
    const isCompact = ['crime', 'court'].includes(sectionSlug);
    const isOpinion = sectionSlug === 'opinion';

    // Opinion: 2-column card grid
    if (isOpinion) {
        return (
            <div className="mb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                    {articles.map((article) => (
                        <Link
                            key={article.id}
                            href={`/${article.section}/${article.id}`}
                            className="article-link group block"
                        >
                            <article className="flex flex-col">
                                {/* Thumbnail */}
                                {article.image && (
                                    <div className="thumbnail-container mb-3 aspect-[16/9] w-full">
                                        <Image
                                            src={article.image}
                                            alt=""
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="article-thumbnail w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <span className="meta-text text-[#B04A2F] font-bold mb-1 block uppercase tracking-widest" style={{ fontSize: "10px" }}>
                                    Opinion
                                </span>
                                <h2 className="headline-sm mb-1.5 line-clamp-3 group-hover:underline decoration-2 underline-offset-4 decoration-[#111]">
                                    {article.title}
                                </h2>
                                {article.subtitle && (
                                    <p className="caption-text mb-2 line-clamp-2">
                                        {article.subtitle}
                                    </p>
                                )}
                                <time className="meta-text" dateTime={article.publishedAt}>
                                    {formatSafeDate(article.publishedAt, {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </time>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        );
    }

    // Compact: wire-style dense rows (crime/court)
    if (isCompact) {
        return (
            <div className="mb-12">
                <div className="flex flex-col">
                    {articles.map((article, index) => (
                        <Link
                            key={article.id}
                            href={`/${article.section}/${article.id}`}
                            className="article-link group block"
                        >
                            <article
                                className={`flex gap-4 py-4 ${index < articles.length - 1 ? 'border-b border-[#E5E5E5]' : ''
                                    }`}
                            >
                                {/* Small thumbnail */}
                                {article.image && (
                                    <div className="thumbnail-container thumbnail-wire">
                                        <Image
                                            src={article.image}
                                            alt=""
                                            width={80}
                                            height={60}
                                            className="article-thumbnail thumbnail-wire object-cover"
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <h2 className="headline-sm mb-0.5 line-clamp-2 group-hover:underline decoration-1 underline-offset-4 decoration-[#111]">
                                        {article.title}
                                    </h2>
                                    {article.subtitle && (
                                        <p className="caption-text mb-1 line-clamp-1">
                                            {article.subtitle}
                                        </p>
                                    )}
                                    <time className="meta-text" dateTime={article.publishedAt}>
                                        {formatSafeDate(article.publishedAt, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </time>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        );
    }

    // Default: horizontal story cards (politics, world-affairs)
    return (
        <div className="mb-12">
            <div className="flex flex-col">
                {articles.map((article, index) => (
                    <Link
                        key={article.id}
                        href={`/${article.section}/${article.id}`}
                        className="article-link group block"
                    >
                        <article
                            className={`flex gap-6 py-6 ${index < articles.length - 1 ? 'border-b border-[#E5E5E5]' : ''
                                }`}
                        >
                            {/* Thumbnail */}
                            {article.image && (
                                <div
                                    className="thumbnail-container shrink-0 overflow-hidden"
                                    style={{ width: "200px", aspectRatio: "3/2" }}
                                >
                                    <Image
                                        src={article.image}
                                        alt=""
                                        fill
                                        sizes="200px"
                                        className="article-thumbnail w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <h2 className="headline-md mb-1.5 line-clamp-3 group-hover:underline decoration-2 underline-offset-4 decoration-[#111]">
                                    {article.title}
                                </h2>
                                {article.subtitle && (
                                    <p className="caption-text mb-2 line-clamp-2">
                                        {article.subtitle}
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <time className="meta-text" dateTime={article.publishedAt}>
                                        {formatSafeDate(article.publishedAt, {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </time>
                                    {article.contentType !== 'news' && (
                                        <>
                                            <span className="meta-text text-[#D0D0D0]">•</span>
                                            <span className="meta-text text-[#B04A2F] font-bold uppercase">
                                                {article.contentType}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </article>
                    </Link>
                ))}
            </div>
        </div>
    );
}
