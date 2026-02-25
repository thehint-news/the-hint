/**
 * Pagination Component
 * 
 * Editorial-style pagination for section pages.
 * Uses URL-based navigation with page query parameter.
 * Matches The Hint's visual language.
 */

import Link from 'next/link';
import { kn } from "@/lib/i18n/kn";

interface PaginationProps {
    /** Current page number (1-indexed) */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Section slug for building URLs */
    sectionSlug: string;
    /** Total number of articles */
    totalArticles: number;
    /** Articles per page */
    articlesPerPage: number;
}

export function Pagination({
    currentPage,
    totalPages,
    sectionSlug,
    totalArticles,
    articlesPerPage
}: PaginationProps) {
    // Don't render if only one page or no articles
    if (totalPages <= 1 || totalArticles === 0) {
        return null;
    }

    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < totalPages;

    // Calculate article range for current page
    const startArticle = (currentPage - 1) * articlesPerPage + 1;
    const endArticle = Math.min(currentPage * articlesPerPage, totalArticles);

    // Generate page numbers to show
    const pageNumbers: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) pageNumbers.push('ellipsis');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pageNumbers.push(i);
        }
        if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
    }

    const getPageHref = (page: number) =>
        page === 1 ? `/${sectionSlug}` : `/${sectionSlug}?page=${page}`;

    return (
        <nav
            className="pt-8 mt-8"
            aria-label="Pagination"
            style={{ borderTop: "1px solid #111" }}
        >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-sans text-[12px] text-[#8A8A8A] tracking-wide uppercase font-medium order-2 sm:order-1">
                    {kn.editorial.showingArticles(startArticle.toLocaleString('kn-IN'), endArticle.toLocaleString('kn-IN'), totalArticles.toLocaleString('kn-IN'))}
                </p>

                {/* Navigation */}
                <div className="flex items-center gap-1 order-1 sm:order-2">
                    {/* Previous */}
                    {hasPrevious ? (
                        <Link
                            href={getPageHref(currentPage - 1)}
                            className="px-3 py-1.5 font-sans text-[12px] font-bold uppercase tracking-wider text-[#111] hover:bg-[#111] hover:text-white transition-colors"
                            aria-label="Previous page"
                        >
                            ←
                        </Link>
                    ) : (
                        <span
                            className="px-3 py-1.5 font-sans text-[12px] font-bold uppercase tracking-wider text-[#D0D0D0] cursor-not-allowed"
                            aria-disabled="true"
                        >
                            ←
                        </span>
                    )}

                    {/* Page Numbers */}
                    {pageNumbers.map((page, idx) => {
                        if (page === 'ellipsis') {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="px-2 py-1.5 font-sans text-[12px] text-[#8A8A8A]"
                                >
                                    …
                                </span>
                            );
                        }

                        const isCurrent = page === currentPage;
                        return (
                            <Link
                                key={page}
                                href={getPageHref(page)}
                                className={`
                                    px-3 py-1.5 font-sans text-[12px] font-bold uppercase tracking-wider transition-colors
                                    ${isCurrent
                                        ? 'bg-[#111] text-white'
                                        : 'text-[#111] hover:bg-[#111] hover:text-white'
                                    }
                                `}
                                aria-current={isCurrent ? 'page' : undefined}
                                aria-label={`ಪುಟ ${page.toLocaleString('kn-IN')}`}
                            >
                                {page.toLocaleString('kn-IN')}
                            </Link>
                        );
                    })}

                    {/* Next */}
                    {hasNext ? (
                        <Link
                            href={getPageHref(currentPage + 1)}
                            className="px-3 py-1.5 font-sans text-[12px] font-bold uppercase tracking-wider text-[#111] hover:bg-[#111] hover:text-white transition-colors"
                            aria-label="Next page"
                        >
                            →
                        </Link>
                    ) : (
                        <span
                            className="px-3 py-1.5 font-sans text-[12px] font-bold uppercase tracking-wider text-[#D0D0D0] cursor-not-allowed"
                            aria-disabled="true"
                        >
                            →
                        </span>
                    )}
                </div>
            </div>
        </nav>
    );
}
