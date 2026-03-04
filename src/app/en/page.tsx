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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

    return {
        title: "The Hint News – Kannada Independent Digital Newspaper",
        description: "The Hint News delivers independent journalism in Kannada. Comprehensive coverage of local news, Karnataka politics, crime, court, world affairs, and opinion with editorial integrity.",
        keywords: ["The Hint News", "Kannada news", "local news", "Karnataka news", "Kannada newspaper", "politics", "crime", "court", "independent journalism", "digital newspaper", "opinion"],
        alternates: {
            canonical: `${siteUrl}/en`,
            languages: {
                'kn': siteUrl,
                'en': `${siteUrl}/en`,
                'x-default': siteUrl,
            },
        },
        robots: { index: true, follow: true },
        openGraph: {
            title: "The Hint News – Kannada Independent Digital Newspaper",
            description: "The Hint News delivers independent journalism in Kannada. Comprehensive coverage of local news, Karnataka politics, crime, court, world affairs, and opinion.",
            url: `${siteUrl}/en`,
            siteName: "The Hint News",
            locale: 'en_US',
            type: 'website',
            images: [
                {
                    url: `${siteUrl}/brand/logo.png`,
                    width: 1200,
                    height: 630,
                    alt: 'The Hint News',
                },
            ],
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
                name: 'The Hint News',
                alternateName: ['ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್', 'TheHintNews'],
                description: 'The Hint News delivers independent journalism in Kannada. Comprehensive coverage of local news, Karnataka politics, crime, court, world affairs, and opinion.',
                publisher: {
                    '@id': 'https://www.thehintnews.in/#organization'
                },
                inLanguage: 'en',
                isAccessibleForFree: true,
            },
            {
                '@type': 'NewsMediaOrganization',
                '@id': 'https://www.thehintnews.in/#organization',
                name: 'The Hint News',
                alternateName: ['ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್', 'TheHintNews', 'The Hint Kannada News'],
                url: 'https://www.thehintnews.in/',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://www.thehintnews.in/brand/logo.png',
                    width: 512,
                    height: 512,
                },
                image: {
                    '@type': 'ImageObject',
                    url: 'https://www.thehintnews.in/brand/logo.png',
                    width: 1200,
                    height: 630,
                },
                description: 'The Hint News is a Kannada independent digital newspaper delivering comprehensive coverage of local news, politics, crime, court, world affairs, and opinion with editorial integrity.',
                sameAs: [
                    'https://twitter.com/thehintnews',
                    'https://www.facebook.com/thehintnews',
                    'https://www.instagram.com/thehintnews',
                    'https://www.youtube.com/@thehintnews'
                ],
                address: {
                    '@type': 'PostalAddress',
                    addressCountry: 'IN',
                    addressRegion: 'Karnataka',
                },
                areaServed: {
                    '@type': 'Place',
                    name: 'Karnataka',
                },
                inLanguage: ['kn', 'en'],
                publishingPrinciples: 'https://www.thehintnews.in/about',
                ethicsPolicy: 'https://www.thehintnews.in/about',
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
