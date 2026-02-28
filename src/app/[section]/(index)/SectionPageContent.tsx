/**
 * Section Page Content (Shared Component)
 * 
 * Shared between Kannada and English section routes.
 */

import { notFound } from 'next/navigation';
import { getSectionPageData, InvalidSectionError } from '@/lib/content';
import { SectionHeader, StoryList, Pagination, LeadStory } from '@/components/editorial';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    getTranslationsForLang,
    applyArticleTranslations,
    buildSectionHrefLang,
} from '@/lib/i18n';
import { Language } from '@/lib/i18n/language';

// Pagination config
const ARTICLES_PER_PAGE = 10;

interface SectionPageContentProps {
    sectionSlug: string;
    currentPage: number;
    lang: Language;
}

export async function SectionPageContent({ sectionSlug, currentPage, lang }: SectionPageContentProps) {
    const t = getTranslationsForLang(lang);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

    // Fetch section data
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

    // Apply translations to all articles
    const localizedArticles = applyArticleTranslations(allArticles, lang);

    // Calculate pagination
    const totalArticles = localizedArticles.length;
    const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

    // Get localized strings
    const sectionName = (t.sections as Record<string, string>)[section.slug] || section.name;
    const sectionDesc = (t.sectionDescriptions as Record<string, string>)[section.slug] || section.description;

    // Get articles for current page
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const pageArticles = localizedArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

    // Handle empty section
    if (localizedArticles.length === 0) {
        return (
            <main id="main-content" className="flex-1">
                <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
                    <SectionHeader
                        name={sectionName}
                        sectionSlug={section.slug}
                        description={sectionDesc}
                    />
                    <EmptyState
                        title={lang === 'kn' ? 'ಯಾವುದೇ ಲೇಖನಗಳಿಲ್ಲ' : 'No Articles Found'}
                        message={lang === 'kn'
                            ? `ಈ ವಿಭಾಗದಲ್ಲಿ ಯಾವುದೇ ಲೇಖನಗಳು ಲಭ್ಯವಿಲ್ಲ.`
                            : `No articles available in this section.`
                        }
                        actionLabel={lang === 'kn' ? 'ಮುಖ್ಯ ಸುದ್ದಿಗಳನ್ನು ಓದಿ' : 'Read Top Stories'}
                        actionHref="/"
                    />
                </div>
            </main>
        );
    }

    // Handle invalid page
    if (pageArticles.length === 0) {
        notFound();
    }

    // Split logic: First article is Lead Story, rest are List
    const leadArticle = pageArticles[0];
    const feedArticles = pageArticles.slice(1);

    // Build hreflang URLs
    const hrefLang = buildSectionHrefLang(section.slug, siteUrl);

    return (
        <main id="main-content" className="flex-1">
            {/* hreflang links */}
            <link rel="alternate" hrefLang="kn" href={hrefLang.kn} />
            <link rel="alternate" hrefLang="en" href={hrefLang.en} />
            <link rel="alternate" hrefLang="x-default" href={hrefLang.xDefault} />

            {/* Section Header */}
            <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "0.5rem" }}>
                <SectionHeader
                    name={sectionName}
                    sectionSlug={section.slug}
                    description={sectionDesc}
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
                <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
                    <StoryList articles={feedArticles} sectionSlug={section.slug} />
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "3rem" }}>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        sectionSlug={section.slug}
                        totalArticles={totalArticles}
                        articlesPerPage={ARTICLES_PER_PAGE}
                    />
                </div>
            )}
        </main>
    );
}
