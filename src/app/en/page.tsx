/**
 * English Homepage
 * 
 * Route: /en
 * Renders English translations of homepage content.
 */

import { Metadata } from "next";
import { getHomepageData } from "@/lib/content/homepage";
import { LeadStory, TopStories, SectionBlock } from "@/components/editorial";
import { logger } from "@/lib/feedback";
import {
    getTranslationsForLang,
    applyArticleTranslation,
    applyArticleTranslations,
} from "@/lib/i18n";
import { SECONDARY_LANGUAGE } from "@/lib/i18n/language";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const lang = SECONDARY_LANGUAGE;
    const t = getTranslationsForLang(lang);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

    return {
        title: t.brand.name,
        description: "Independent journalism delivered as it happens. Comprehensive and in-depth authoritative news coverage.",
        alternates: {
            canonical: `${siteUrl}/en`,
            languages: {
                'kn': siteUrl,
                'en': `${siteUrl}/en`,
                'x-default': siteUrl,
            },
        },
        // Both languages indexable now (Phase 3)
        robots: { index: true, follow: true },
        openGraph: {
            title: t.brand.name,
            description: "Independent journalism delivered as it happens.",
            url: `${siteUrl}/en`,
            siteName: t.brand.name,
            locale: 'en_US',
            type: 'website',
        },
    };
}

export default async function EnglishHomePage() {
    const lang = SECONDARY_LANGUAGE;
    const t = getTranslationsForLang(lang);

    let homepageData;
    try {
        homepageData = await getHomepageData();
        logger.info('[EnglishHomePage] Successfully fetched data');
    } catch (error) {
        logger.error('[EnglishHomePage] Failed to fetch data:', error);
        homepageData = {
            leadStory: null,
            topStories: [],
            sections: { crime: [], court: [], politics: [], worldAffairs: [], opinion: [] }
        };
    }

    const { leadStory, topStories, sections } = homepageData;

    // Apply translations to all articles
    const localizedLeadStory = leadStory ? applyArticleTranslation(leadStory, lang) : null;
    const localizedTopStories = applyArticleTranslations(topStories, lang);
    const localizedSections = {
        crime: applyArticleTranslations(sections.crime, lang),
        court: applyArticleTranslations(sections.court, lang),
        politics: applyArticleTranslations(sections.politics, lang),
        worldAffairs: applyArticleTranslations(sections.worldAffairs, lang),
        opinion: applyArticleTranslations(sections.opinion, lang),
    };

    // Get localized section titles
    const sectionTitles = {
        crime: (t.sections as Record<string, string>)['crime'] || 'Crime',
        court: (t.sections as Record<string, string>)['court'] || 'Court',
        politics: (t.sections as Record<string, string>)['politics'] || 'Politics',
        worldAffairs: (t.sections as Record<string, string>)['world-affairs'] || 'World Affairs',
        opinion: (t.sections as Record<string, string>)['opinion'] || 'Opinion',
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': 'https://www.thehintnews.in/en/#website',
                url: 'https://www.thehintnews.in/en',
                name: t.brand.name,
                description: 'Independent journalism delivered as it happens.',
                publisher: {
                    '@id': 'https://www.thehintnews.in/#organization'
                },
                inLanguage: 'en'
            },
            {
                '@type': 'Organization',
                '@id': 'https://www.thehintnews.in/#organization',
                name: 'The Hint',
                url: 'https://www.thehintnews.in/',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://www.thehintnews.in/logo.png'
                },
                sameAs: [
                    'https://twitter.com/thehintnews',
                    'https://www.facebook.com/thehintnews',
                    'https://www.instagram.com/thehintnews',
                    'https://www.youtube.com/@thehintnews'
                ]
            }
        ]
    };

    return (
        <main id="main-content" className="flex-1">
            {/* hreflang links */}
            <link rel="alternate" hrefLang="kn" href="https://www.thehintnews.in/" />
            <link rel="alternate" hrefLang="en" href="https://www.thehintnews.in/en" />
            <link rel="alternate" hrefLang="x-default" href="https://www.thehintnews.in/" />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* 2. LEAD STORY */}
            <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "1.5rem" }}>
                <LeadStory article={localizedLeadStory} />
            </div>
            <hr className="full-width-divider" />

            {/* 3. SECONDARY LEADS */}
            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <TopStories articles={localizedTopStories} />
            </div>
            <hr className="full-width-divider" />

            {/* 4. CRIME & COURT */}
            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <div className="grid-12">
                    {/* Left: Crime Section */}
                    <div className="col-span-6">
                        <SectionBlock
                            sectionTitle={sectionTitles.crime}
                            sectionSlug="crime"
                            articles={localizedSections.crime}
                        />
                    </div>

                    {/* Right: Court Section */}
                    <div className="col-span-6">
                        <SectionBlock
                            sectionTitle={sectionTitles.court}
                            sectionSlug="court"
                            articles={localizedSections.court}
                        />
                    </div>
                </div>
            </div>
            <hr className="full-width-divider" />

            {/* 5. MID-PAGE SECTIONS */}
            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <div className="grid-12">
                    {/* Left: Politics - Vertical List */}
                    <div className="col-span-6">
                        <SectionBlock
                            sectionTitle={sectionTitles.politics}
                            sectionSlug="politics"
                            articles={localizedSections.politics}
                        />
                    </div>

                    {/* Right: World Affairs - Two Column Image-Led */}
                    <div className="col-span-6">
                        <SectionBlock
                            sectionTitle={sectionTitles.worldAffairs}
                            sectionSlug="world-affairs"
                            articles={localizedSections.worldAffairs}
                        />
                    </div>
                </div>
            </div>
            <hr className="full-width-divider" />

            {/* 6. OPINION & ANALYSIS */}
            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
                <SectionBlock
                    sectionTitle="Opinion & Analysis"
                    sectionSlug="opinion"
                    articles={localizedSections.opinion}
                />
            </div>
        </main>
    );
}
