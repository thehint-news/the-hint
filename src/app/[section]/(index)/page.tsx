/**
 * Section Landing Page
 * 
 * Renders articles for a given section with pagination.
 * 10 articles per page: 1 hero + 9 in list.
 * 
 * NO filtering, sorting, or editorial logic here.
 */

import { notFound } from 'next/navigation';
import { getSectionPageData, InvalidSectionError } from '@/lib/content';
import { SectionHeader, StoryList, Pagination, LeadStory } from '@/components/editorial';

// Revalidate section pages every 60 seconds
export const revalidate = 60;

// Pagination config
const ARTICLES_PER_PAGE = 10;

interface SectionPageProps {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<{
        page?: string;
    }>;
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
    const { section: sectionSlug } = await params;
    const resolvedSearchParams = await searchParams;

    // Parse page number (default to 1)
    const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

    // Fetch section data (throws InvalidSectionError for invalid sections)
    let data;
    try {
        data = getSectionPageData(sectionSlug);
    } catch (error) {
        if (error instanceof InvalidSectionError) {
            notFound();
        }
        throw error;
    }

    const { section, articles: allArticles } = data;

    // Calculate pagination
    const totalArticles = allArticles.length;
    const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

    // Redirect to page 1 if page is out of range
    if (currentPage > totalPages && totalPages > 0) {
        // Show last page instead of 404
        const validPage = totalPages;
        const startIndex = (validPage - 1) * ARTICLES_PER_PAGE;
        const pageArticles = allArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

        if (pageArticles.length === 0) {
            return (
                <main className="max-w-4xl mx-auto px-4 py-12">
                    <SectionHeader name={section.name} description={section.description} />
                    <div className="py-12 text-center border-t border-neutral-300">
                        <p className="text-lg font-serif italic text-neutral-500">
                            No stories available in this section.
                        </p>
                    </div>
                </main>
            );
        }
    }

    // Get articles for current page
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const pageArticles = allArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

    // Handle empty section
    if (allArticles.length === 0) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-12">
                <SectionHeader
                    name={section.name}
                    description={section.description}
                />
                <div className="py-12 text-center border-t border-neutral-300">
                    <p className="text-lg font-serif italic text-neutral-500">
                        No stories available in this section.
                    </p>
                </div>
            </main>
        );
    }

    // Handle invalid page (beyond range)
    if (pageArticles.length === 0) {
        notFound();
    }

    // Split logic: First article is Lead Story, rest are List
    const leadArticle = pageArticles[0];
    const feedArticles = pageArticles.slice(1);

    return (
        <main className="max-w-4xl mx-auto px-4 py-12">
            {/* Section Header */}
            <SectionHeader
                name={section.name}
                description={section.description}
            />

            {/* Lead Story (Top) */}
            <LeadStory article={leadArticle} />

            {/* Separator if we have a list */}
            {feedArticles.length > 0 && (
                <hr className="my-8 border-neutral-200" />
            )}

            {/* Article List (Main Body) */}
            {feedArticles.length > 0 && (
                <StoryList
                    articles={feedArticles}
                    sectionSlug={section.slug}
                />
            )}

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                sectionSlug={section.slug}
                totalArticles={totalArticles}
                articlesPerPage={ARTICLES_PER_PAGE}
            />
        </main>
    );
}
