/**
 * Section Landing Page
 * 
 * Renders articles for a given section with pagination.
 * 10 articles per page: 1 hero + 9 in list.
 * 
 * Uses `container-editorial` for consistent layout with homepage.
 * 
 * NO filtering, sorting, or editorial logic here.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSectionPageData, InvalidSectionError } from '@/lib/content';
import { SectionHeader, StoryList, Pagination, LeadStory } from '@/components/editorial';
import { EmptyState } from '@/components/ui/EmptyState';

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

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
    const { section: sectionSlug } = await params;

    try {
        const { section } = await getSectionPageData(sectionSlug);

        return {
            title: `${section.name} News`,
            description: section.description,
            openGraph: {
                title: `${section.name} News | The Hint`,
                description: section.description,
                type: 'website',
                url: `/${section.slug}`,
            },
        };
    } catch {
        return {
            title: 'Section Not Found',
        };
    }
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
    const { section: sectionSlug } = await params;
    const resolvedSearchParams = await searchParams;

    // Parse page number (default to 1)
    const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

    // Fetch section data (throws InvalidSectionError for invalid sections)
    let data;
    try {
        data = await getSectionPageData(sectionSlug);
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
        const validPage = totalPages;
        const startIndex = (validPage - 1) * ARTICLES_PER_PAGE;
        const pageArticles = allArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

        if (pageArticles.length === 0) {
            return (
                <main id="main-content" className="flex-1">
                    <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
                        <SectionHeader name={section.name} description={section.description} />
                        <div className="py-12 text-center">
                            <p className="font-serif text-lg italic text-[#8A8A8A]">
                                No stories available in this section.
                            </p>
                        </div>
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
            <main id="main-content" className="flex-1">
                <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
                    <SectionHeader
                        name={section.name}
                        description={section.description}
                    />
                    <EmptyState
                        title="This section is quiet... for now."
                        message={`We haven't published any stories in ${section.name} just yet. Our editorial team is working on it.`}
                        actionLabel="Read Top Stories"
                        actionHref="/"
                    />
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
        <main id="main-content" className="flex-1">
            {/* Section Header */}
            <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "0.5rem" }}>
                <SectionHeader
                    name={section.name}
                    description={section.description}
                    articleCount={totalArticles}
                />
            </div>

            {/* Lead Story */}
            <div className="container-editorial" style={{ paddingBottom: "1rem" }}>
                <LeadStory article={leadArticle} />
            </div>

            {/* Divider */}
            {feedArticles.length > 0 && (
                <hr className="full-width-divider" />
            )}

            {/* Article List */}
            {feedArticles.length > 0 && (
                <div className="container-editorial" style={{ paddingTop: "1.5rem" }}>
                    <StoryList
                        articles={feedArticles}
                        sectionSlug={section.slug}
                    />
                </div>
            )}

            {/* Pagination */}
            <div className="container-editorial" style={{ paddingBottom: "3rem" }}>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    sectionSlug={section.slug}
                    totalArticles={totalArticles}
                    articlesPerPage={ARTICLES_PER_PAGE}
                />
            </div>
        </main>
    );
}
