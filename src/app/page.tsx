/**
 * Homepage
 * 
 * The Hint - A Classic Broadsheet Newspaper Homepage
 * 
 * LAYOUT STRUCTURE:
 * 1. TOP MASTHEAD - Centered "THE HINT" with navigation
 * 2. LEAD STORY - Full-width dominant story
 * 3. SECONDARY LEADS - Two column stories
 * 4. CRIME & COURT - Split view layout (side by side)
 * 5. MID-PAGE: Politics (Left) + World Affairs (Right)
 * 6. OPINION & ANALYSIS - Four columns
 * 7. FOOTER - Institutional dark footer
 * 
 * All editorial selection logic is handled by getHomepageData().
 * This component only handles rendering and layout.
 * 
 * BILINGUAL SUPPORT:
 * - Articles are translated server-side based on cookie
 * - NO runtime translation API calls
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

// Force dynamic rendering — GitHub API calls at build time cause timeouts
// on Vercel's single-worker free plan. Content is still cached via ISR.
export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * Generate SEO metadata for homepage
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getTranslationsForLang('kn');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

  return {
    title: t.brand.name,
    description: "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ. ಸಮಗ್ರತೆ ಮತ್ತು ಆಳದೊಂದಿಗೆ ಅಧಿಕೃತ ಸುದ್ದಿ ಪ್ರಸಾರ.",
    alternates: {
      canonical: siteUrl,
      languages: {
        'kn': siteUrl,
        'en': `${siteUrl}/en`,
        'x-default': siteUrl,
      },
    },
    // Phase 3: Both languages indexable with route-based structure
    robots: { index: true, follow: true },
    openGraph: {
      title: t.brand.name,
      description: "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ.",
      url: siteUrl,
      siteName: t.brand.name,
      locale: 'kn_IN',
      type: 'website',
    },
  };
}

export default async function HomePage() {
  const lang = 'kn'; // Kannada homepage is always Kannada
  const t = getTranslationsForLang(lang);

  let homepageData;
  try {
    homepageData = await getHomepageData();
    logger.info('[HomePage] Successfully fetched data');
  } catch (error) {
    logger.error('[HomePage] Failed to fetch data:', error);
    // Return empty state or error UI to prevent 404/500
    homepageData = {
      leadStory: null,
      topStories: [],
      sections: { crime: [], court: [], politics: [], worldAffairs: [], opinion: [] }
    };
  }

  const { leadStory, topStories, sections } = homepageData;

  // Debug logging for lead story
  if (leadStory) {
    console.log('[HomePage] Lead story found:', {
      id: leadStory.id,
      title: leadStory.title.substring(0, 30),
      isLead: leadStory.isLead,
      hasLeadMedia: !!leadStory.leadMedia,
      leadImagesCount: leadStory.leadMedia?.images?.length || 0,
    });
  } else {
    console.log('[HomePage] No lead story found');
  }

  // Apply translations to all articles
  const localizedLeadStory = leadStory ? applyArticleTranslation(leadStory, lang) : null;

  // Debug: Check if leadMedia survived translation
  if (localizedLeadStory) {
    console.log('[HomePage] Localized lead story:', {
      hasLeadMedia: !!localizedLeadStory.leadMedia,
      leadImagesCount: localizedLeadStory.leadMedia?.images?.length || 0,
    });
  }

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
        '@id': 'https://www.thehintnews.in/#website',
        url: 'https://www.thehintnews.in/',
        name: t.brand.name,
        description: lang === 'kn'
          ? 'ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ.'
          : 'Independent journalism delivered as it happens.',
        publisher: {
          '@id': 'https://www.thehintnews.in/#organization'
        },
        inLanguage: 'kn'
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
      {/* hreflang links for SEO */}
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
          sectionTitle={lang === 'kn' ? 'ಅಭಿಪ್ರಾಯ ವಿಶ್ಲೇಷಣೆ' : 'Opinion & Analysis'}
          sectionSlug="opinion"
          articles={localizedSections.opinion}
        />
      </div>
    </main>
  );
}
