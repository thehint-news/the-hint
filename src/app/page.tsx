/**
 * Homepage
 */

import { Metadata } from "next";
import { getHomepageData } from "@/lib/content/homepage";
import { LeadStory, TopStories, SectionBlock } from "@/components/editorial";
import { logger } from "@/lib/feedback";
import { kn } from "@/lib/i18n";

// Use ISR for the homepage
export const revalidate = 300;

/**
 * Generate SEO metadata for homepage
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

  return {
    title: "The Hint News – Digital Kannada Newspaper",
    description: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ಸ್ಥಳೀಯ, ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳು ಮತ್ತು ಅಭಿಪ್ರಾಯಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ.",
    keywords: ["ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್", "ಕನ್ನಡ ಸುದ್ದಿ", "ಸ್ಥಳೀಯ", "ಕರ್ನಾಟಕ ಸುದ್ದಿ", "ಕನ್ನಡ ಪತ್ರಿಕೆ", "ರಾಜಕೀಯ", "ಕ್ರೈಂ", "ನ್ಯಾಯಾಲಯ", "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ", "ಅಭಿಪ್ರಾಯ"],
    alternates: {
      canonical: siteUrl,
      languages: {
        'kn': siteUrl,
        'x-default': siteUrl,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: "The Hint News – Digital Kannada Newspaper",
      description: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ಸ್ಥಳೀಯ, ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳು ಮತ್ತು ಅಭಿಪ್ರಾಯಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ.",
      url: siteUrl,
      siteName: "The Hint News",
      locale: 'kn_IN',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/brand/logo.png`,
          width: 1200,
          height: 630,
          alt: 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್',
        },
      ],
    },
  };
}

export default async function HomePage() {
  const t = kn;

  let homepageData;
  try {
    homepageData = await getHomepageData();
    logger.info('[HomePage] Successfully fetched data');
  } catch (error) {
    logger.error('[HomePage] Failed to fetch data:', error);
    homepageData = {
      leadStory: null,
      topStories: [],
      sections: { crime: [], court: [], politics: [], worldAffairs: [], opinion: [] }
    };
  }

  const { leadStory, topStories, sections } = homepageData;

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
        name: 'The Hint News',
        alternateName: ['ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್', 'TheHintNews'],
        description: 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ಸ್ಥಳೀಯ, ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳು ಮತ್ತು ಅಭಿಪ್ರಾಯಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ.',
        publisher: {
          '@id': 'https://www.thehintnews.in/#organization'
        },
        inLanguage: 'kn',
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
        inLanguage: ['kn'],
        publishingPrinciples: 'https://www.thehintnews.in/about',
        ethicsPolicy: 'https://www.thehintnews.in/about',
      }
    ]
  };

  return (
    <main id="main-content" className="flex-1">
      {/* hreflang links for SEO */}
      <link rel="alternate" hrefLang="kn" href="https://www.thehintnews.in/" />
      <link rel="alternate" hrefLang="x-default" href="https://www.thehintnews.in/" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 2. LEAD STORY */}
      <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "1.5rem" }}>
        <LeadStory article={leadStory} />
      </div>
      <hr className="full-width-divider" />

      {/* 3. SECONDARY LEADS */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
        <TopStories articles={topStories} />
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
              articles={sections.crime}
            />
          </div>

          {/* Right: Court Section */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle={sectionTitles.court}
              sectionSlug="court"
              articles={sections.court}
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
              articles={sections.politics}
            />
          </div>

          {/* Right: World Affairs - Two Column Image-Led */}
          <div className="col-span-6">
            <SectionBlock
              sectionTitle={sectionTitles.worldAffairs}
              sectionSlug="world-affairs"
              articles={sections.worldAffairs}
            />
          </div>
        </div>
      </div>
      <hr className="full-width-divider" />

      {/* 6. OPINION & ANALYSIS */}
      <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <SectionBlock
          sectionTitle="ಅಭಿಪ್ರಾಯ ವಿಶ್ಲೇಷಣೆ"
          sectionSlug="opinion"
          articles={sections.opinion}
        />
      </div>
    </main>
  );
}
