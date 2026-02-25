/**
 * ArticleHeader Component
 * 
 * Renders the article headline, subtitle, and section label.
 * Optimized for long-form reading with maximum typographic prominence.
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from 'next/link';
import { kn } from "@/lib/i18n/kn";

interface ArticleHeaderProps {
    title: string;
    subtitle: string;
    sectionLabel: string;
    sectionSlug: string;
    contentTypeLabel?: string;
    publishedAt: string;
    updatedAt: string | null;
}

export function ArticleHeader({
    title,
    subtitle,
    sectionLabel,
    sectionSlug,
    contentTypeLabel,
    publishedAt,
    updatedAt,
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
            {/* 1. Section Label */}
            <div className="mb-3 flex items-center gap-4">
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

            {/* 2. Large Headline */}
            <h1 className={`font-serif text-[clamp(2rem,7vw,3.5rem)] font-black leading-[1.25] mb-6 text-[#111111] max-w-4xl tracking-normal ${isOpinion ? 'italic' : ''}`}>
                {title}
            </h1>

            {/* 3. Subheadline */}
            <p className="font-serif text-[clamp(1.125rem,3vw,1.5rem)] leading-[1.6] text-[#2B2B2B] mb-8 max-w-3xl">
                {subtitle}
            </p>

            {/* 4. Meta Row */}
            <div className="flex items-center gap-4 text-sm font-sans text-[#6B6B6B] mb-6">

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

            {/* 5. Thin Horizontal Rule */}
            <hr className="border-t border-[#D9D9D9] w-full" />
        </header>
    );
}
