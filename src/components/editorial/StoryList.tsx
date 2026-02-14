/**
 * StoryList Component
 * 
 * Renders a list of stories for section pages.
 * Receives fully prepared article data via props.
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
            <div className="py-12 text-center border-t border-black">
                <p className="text-lg font-serif italic text-neutral-500">
                    No stories available in this section.
                </p>
            </div>
        );
    }

    // layout variants
    const isCompact = ['crime', 'court'].includes(sectionSlug);
    const isOpinion = sectionSlug === 'opinion';

    return (
        <div className="mb-12">
            {/* Story List */}
            <div className="flex flex-col">
                {articles.map((article, index) => (
                    <article
                        key={article.id}
                        className={`
                            group relative flex gap-6
                            ${index < articles.length - 1 ? 'border-b border-neutral-200' : ''}
                            ${isCompact ? 'py-3' : 'py-6'}
                            ${isOpinion ? 'py-5' : ''}
                        `}
                    >
                        {/* Image (Left) */}
                        {article.image && (
                            <div className={`
                                shrink-0 overflow-hidden bg-neutral-100 relative
                                ${isCompact ? 'w-24 h-24' : 'w-48 aspect-[3/2]'}
                                ${isOpinion ? 'w-32 aspect-[3/4]' : ''}
                            `}>
                                <Image
                                    src={article.image}
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 100px, 200px"
                                    className="object-cover transition-all duration-300 group-hover:brightness-90 group-hover:scale-105"
                                />
                            </div>
                        )}

                        {/* Content (Right) */}
                        <div className="flex-1 flex flex-col justify-center">
                            {/* Meta Top (Opinion only) */}
                            {isOpinion && (
                                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
                                    OPINION
                                </span>
                            )}

                            {/* Headline */}
                            <Link href={`/${article.section}/${article.id}`} className="block">
                                <h2 className={`
                                    font-bold text-neutral-900 leading-tight mb-2 group-hover:underline decoration-2 underline-offset-4
                                    ${isCompact ? 'text-lg' : 'text-2xl font-serif'}
                                    ${isOpinion ? 'text-xl font-serif italic' : ''}
                                `}>
                                    {article.title}
                                </h2>
                            </Link>

                            {/* Summary / Subtitle */}
                            {!isCompact && (
                                <p className={`
                                    text-neutral-600 mb-2
                                    ${isOpinion ? 'text-sm' : 'text-base'}
                                    line-clamp-2
                                `}>
                                    {article.subtitle}
                                </p>
                            )}

                            {/* Compact Hint */}
                            {isCompact && article.subtitle && (
                                <p className="text-sm text-neutral-500 line-clamp-1 mb-1">
                                    {article.subtitle}
                                </p>
                            )}

                            {/* Date / Meta */}
                            <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium uppercase tracking-wider">
                                <time dateTime={article.publishedAt}>
                                    {formatSafeDate(article.publishedAt, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </time>
                                {article.contentType !== 'news' && !isOpinion && (
                                    <>
                                        <span>•</span>
                                        <span className="text-red-700">
                                            {article.contentType}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
