import type { Metadata } from "next";
import { headers } from "next/headers";
import { Playfair_Display, Inter, Anek_Kannada, Tiro_Kannada, Noto_Serif_Kannada } from "next/font/google";
import "./globals.css";
import { getAllArticles } from "@/lib/content/reader";
import {
  getTranslationsForLang,
  Language,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n";
import { getLanguageFromCookie } from "@/lib/i18n/cookies-server";
import { LanguageProvider } from "@/components/i18n/LanguageContext";

// Serif font for headlines - authoritative, editorial feel
const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Sans-serif for body and UI - clean, readable
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Kannada sans-serif for body text and UI — modern, clean and professional
const anekKannada = Anek_Kannada({
  variable: "--font-kannada-sans",
  subsets: ["kannada"],
  display: "swap",
});

// Kannada serif for headlines — authoritative, authentic newspaper print feel
const tiroKannada = Tiro_Kannada({
  variable: "--font-kannada-serif",
  subsets: ["kannada"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

// Bold Kannada serif for lead story headlines
const notoSerifKannada = Noto_Serif_Kannada({
  variable: "--font-kannada-serif-bold",
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

import { Header, Footer } from "@/components/layout";
import { SubscribePopup } from "@/components/features/SubscribePopup";
import ScrollToTop from "@/components/features/ScrollToTop";
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import PageViewTracker from '@/components/analytics/PageViewTracker';

/**
 * Generate metadata based on current language
 * Creates SEO-safe metadata with hreflang support
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguageFromCookie();
  const t = getTranslationsForLang(lang);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

  // Build hreflang links for all supported languages
  const languages: Record<string, string> = {};
  SUPPORTED_LANGUAGES.forEach((l: Language) => {
    languages[l] = `${siteUrl}/?lang=${l}`;
  });

  // x-default points to canonical (Kannada)
  languages['x-default'] = siteUrl;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t.brand.name,
      template: `%s | ${t.brand.name}`,
    },
    description: lang === 'kn'
      ? "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ. ಸಮಗ್ರತೆ ಮತ್ತು ಆಳದೊಂದಿಗೆ ಅಧಿಕೃತ ಸುದ್ದಿ ಪ್ರಸಾರ."
      : "Independent journalism delivered as it happens. Comprehensive and in-depth authoritative news coverage.",
    keywords: ["news", "politics", "world affairs", "crime", "court", "opinion", "journalism", "independent news", "kannada"],
    authors: [{ name: "The Hint Editorial Board" }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: siteUrl,
      languages,
    },
    openGraph: {
      title: t.brand.name,
      description: lang === 'kn'
        ? "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ. ಸಮಗ್ರತೆ ಮತ್ತು ಆಳದೊಂದಿಗೆ ಅಧಿಕೃತ ಸುದ್ದಿ ಪ್ರಸಾರ."
        : "Independent journalism delivered as it happens. Comprehensive and in-depth authoritative news coverage.",
      url: new URL(siteUrl),
      siteName: t.brand.name,
      locale: lang === 'kn' ? 'kn_IN' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.brand.name,
      description: lang === 'kn'
        ? "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ ನಡೆದಂತೆ ತಲುಪಿಸಲಾಗುತ್ತದೆ."
        : "Independent journalism delivered as it happens.",
      creator: "@thehintnews",
    },
    verification: {
      // google: '...', // Placeholder for verification code
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect language from route pathname first, then fall back to cookie
  const headersList = await headers();
  const pathname = headersList.get('x-invoke-path') || '';

  // Route-based language detection: /en/* routes are English
  const isEnglishRoute = pathname.startsWith('/en');
  const cookieLang = await getLanguageFromCookie();
  const lang: Language = isEnglishRoute ? 'en' : (cookieLang === 'en' ? 'en' : 'kn');

  // Fetch articles for global UI elements (Ticker, Updated Indicator)
  let tickerHeadlines: string[] = [];
  let latestUpdate: string | undefined = undefined;

  try {
    const allArticles = await getAllArticles();
    // Latest update timestamp (from any article)
    latestUpdate = allArticles.length > 0 ? allArticles[0].publishedAt : undefined;
    // Ticker headlines: No opinion, max 6, latest first
    tickerHeadlines = allArticles
      .filter(a => a.contentType !== 'opinion')
      .slice(0, 6)
      .map(a => a.title);
  } catch (error) {
    console.error('[RootLayout] Failed to fetch global article data:', error);
    // Fallback: Empty ticker, undefined update property
  }

  // Language attribute for HTML tag
  const htmlLang = lang === 'en' ? 'en' : 'kn';

  return (
    <html lang={htmlLang} className={`${anekKannada.variable} ${tiroKannada.variable} ${notoSerifKannada.variable}`}>
      <head>
        {/* Prevent browser auto-translation to avoid duplicate content issues */}
        <meta name="google" content="notranslate" />
        {/* hreflang tags for SEO */}
        <link rel="alternate" hrefLang="kn" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in'}/?lang=kn`} />
        <link rel="alternate" hrefLang="en" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in'}/?lang=en`} />
        <link rel="alternate" hrefLang="x-default" href={process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in'} />
      </head>
      <body className={`${playfairDisplay.variable} ${inter.variable}`}>
        <LanguageProvider initialLanguage={lang}>
          <PageViewTracker />
          <div className="min-h-screen flex flex-col">
            <Header latestUpdate={latestUpdate} tickerHeadlines={tickerHeadlines} />
            <ScrollToTop />
            {children}
            <Footer />
            <SubscribePopup />
          </div>
          <GoogleAnalytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
