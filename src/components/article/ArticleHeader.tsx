/**
 * ArticleHeader Component
 * 
 * Renders the article headline, subtitle, section label, and share buttons.
 * Optimized for long-form reading with maximum typographic prominence.
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from 'next/link';
import { kn } from "@/lib/i18n/kn";
import { ShareButtons } from './ShareButtons';
import { ArticleLanguageToggle, CompactArticleLanguageToggle } from './ArticleLanguageToggle';

interface ArticleHeaderProps {
    title: string;
    subtitle: string;
    sectionLabel: string;
    sectionSlug: string;
    contentTypeLabel?: string;
    publishedAt: string;
    updatedAt: string | null;
    /** Optional: show share buttons in header (top right) */
    showShareInHeader?: boolean;
}

export function ArticleHeader({
    title,
    subtitle,
    sectionLabel,
    sectionSlug,
    contentTypeLabel,
    publishedAt,
    updatedAt,
    showShareInHeader = true,
}: ArticleHeaderProps) {
    // Format dates
    const formattedPublished = new Date(publishedAt).toLocaleDateString('kn-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const displaySection = (kn.sections as Record<string, string>)[sectionSlug] || sectionLabel;
    const isOpinion = contentTypeLabel === 'opinion';
    const displayContentType = contentTypeLabel ? (kn.contentTypes as Record<string, string>)[contentTypeLabel.toLowerCase()] || contentTypeLabel : null;

    return (
        <header className="mb-6">
            {/* 1. Section Label with Share (top right on desktop) */}
            <div className="mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/${sectionSlug}`} className="hover:opacity-70 transition-opacity">
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A8A8A]">
                            {displaySection}
                        </span>
                    </Link>
                    {displayContentType &&
                        contentTypeLabel !== 'news' &&
                        displayContentType !== displaySection && (
                            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A8A8A] border-l border-[#D9D9D9] pl-4">
                                {displayContentType}
                            </span>
                        )}
                </div>
                {showShareInHeader && (
                    <div className="hidden md:flex items-center gap-4">
                        {/* Language Toggle - Premium design */}
                        <ArticleLanguageToggle />
                        <div className="w-px h-6 bg-[#E0E0E0]" />
                        <ShareButtons
                            title={title}
                            description={subtitle}
                            variant="inline"
                        />
                    </div>
                )}
            </div>

            {/* 2. Large Headline */}
            <h1 className={`font-serif text-[clamp(2rem,7vw,3.5rem)] font-black leading-tight mb-6 text-[#111111] max-w-4xl tracking-normal ${isOpinion ? 'italic' : ''}`}>
                {title}
            </h1>

            {/* 3. Subheadline */}
            <p className="font-serif text-[clamp(1.125rem,3vw,1.5rem)] leading-[1.6] text-[#2B2B2B] mb-8 max-w-3xl">
                {subtitle}
            </p>

            {/* 4. Meta Row with Share (mobile only) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-4 text-sm font-sans text-[#6B6B6B] mb-6">
                <div className="flex items-center gap-4">
                    <time dateTime={publishedAt}>
                        {formattedPublished}
                    </time>
                    {updatedAt && (
                        <>
                            <span aria-hidden="true" className="text-[#D9D9D9]">•</span>
                            <time dateTime={updatedAt}>
                                {kn.time.updatedOn}{new Date(updatedAt).toLocaleDateString('kn-IN', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </time>
                        </>
                    )}
                </div>
                {showShareInHeader && (
                    <div className="md:hidden flex items-center justify-between gap-4 flex-wrap">
                        <CompactArticleLanguageToggle />
                        <ShareButtons
                            title={title}
                            description={subtitle}
                            variant="inline"
                        />
                    </div>
                )}
            </div>

            {/* 5. Thin Horizontal Rule */}
            <hr className="border-t border-[#D9D9D9] w-full" />
        </header>
    );
}
