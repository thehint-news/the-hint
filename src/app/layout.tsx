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
      default: lang === 'kn'
        ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ – ಕನ್ನಡ ಸ್ವತಂತ್ರ ಡಿಜಿಟಲ್ ಪತ್ರಿಕೆ"
        : "The Hint News – Kannada Independent Digital Newspaper",
      template: `%s | ${t.brand.name}`,
    },
    description: lang === 'kn'
      ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ."
      : "The Hint News delivers independent journalism in Kannada. Comprehensive coverage of Karnataka politics, crime, court, and world affairs with editorial integrity.",
    keywords: lang === 'kn'
      ? ["ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್", "ಕನ್ನಡ ಸುದ್ದಿ", "ಕರ್ನಾಟಕ ಸುದ್ದಿ", "ಕನ್ನಡ ಪತ್ರಿಕೆ", "ರಾಜಕೀಯ", "ಕ್ರೈಂ", "ನ್ಯಾಯಾಲಯ", "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ"]
      : ["The Hint News", "Kannada news", "Karnataka news", "Kannada newspaper", "politics", "crime", "court", "independent journalism", "digital newspaper"],
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
      title: lang === 'kn'
        ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ – ಕನ್ನಡ ಸ್ವತಂತ್ರ ಡಿಜಿಟಲ್ ಪತ್ರಿಕೆ"
        : "The Hint News – Kannada Independent Digital Newspaper",
      description: lang === 'kn'
        ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ."
        : "The Hint News delivers independent journalism in Kannada. Comprehensive coverage of Karnataka politics, crime, court, and world affairs with editorial integrity.",
      url: new URL(siteUrl),
      siteName: t.brand.name,
      locale: lang === 'kn' ? 'kn_IN' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/brand/logo.png`,
          width: 1200,
          height: 630,
          alt: lang === 'kn' ? 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್' : 'The Hint News',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: lang === 'kn'
        ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ – ಕನ್ನಡ ಸ್ವತಂತ್ರ ಡಿಜಿಟಲ್ ಪತ್ರಿಕೆ"
        : "The Hint News – Kannada Independent Digital Newspaper",
      description: lang === 'kn'
        ? "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ."
        : "The Hint News delivers independent journalism in Kannada.",
      creator: "@thehintnews",
      images: [`${siteUrl}/brand/logo.png`],
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

  // Fetch articles for global UI elements (Updated Indicator)
  let latestUpdate: string | undefined = undefined;

  try {
    const allArticles = await getAllArticles();
    // Latest update timestamp (from any article)
    latestUpdate = allArticles.length > 0 ? allArticles[0].publishedAt : undefined;
  } catch (error) {
    console.error('[RootLayout] Failed to fetch global article data:', error);
    // Fallback: undefined update property
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
            <Header latestUpdate={latestUpdate} />
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
