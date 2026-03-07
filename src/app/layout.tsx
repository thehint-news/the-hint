import type { Metadata } from "next";
import { Playfair_Display, Inter, Anek_Kannada, Tiro_Kannada, Noto_Serif_Kannada } from "next/font/google";
import "./globals.css";
import { getAllArticles } from "@/lib/content/reader";
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
 * Generate metadata for the site
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "The Hint News – Digital Kannada Newspaper",
      template: `%s | The Hint News`,
    },
    description: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ಸ್ಥಳೀಯ, ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳು ಮತ್ತು ಅಭಿಪ್ರಾಯಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ.",
    keywords: ["ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್", "ಕನ್ನಡ ಸುದ್ದಿ", "ಸ್ಥಳೀಯ", "ಕರ್ನಾಟಕ ಸುದ್ದಿ", "ಕನ್ನಡ ಪತ್ರಿಕೆ", "ರಾಜಕೀಯ", "ಕ್ರೈಂ", "ನ್ಯಾಯಾಲಯ", "ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮ", "ಅಭಿಪ್ರಾಯ"],
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
      languages: {
        kn: siteUrl,
        'x-default': siteUrl,
      },
    },
    openGraph: {
      title: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ – ಕನ್ನಡ ಸ್ವತಂತ್ರ ಡಿಜಿಟಲ್ ಪತ್ರಿಕೆ",
      description: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ. ಸ್ಥಳೀಯ, ರಾಜಕೀಯ, ಕ್ರೈಂ, ನ್ಯಾಯಾಲಯ, ವಿಶ್ವ ವಿದ್ಯಮಾನಗಳು ಮತ್ತು ಅಭಿಪ್ರಾಯಗಳ ಸಮಗ್ರ ಸುದ್ದಿ ವರದಿ.",
      url: new URL(siteUrl),
      siteName: 'The Hint News',
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
    twitter: {
      card: 'summary_large_image',
      title: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ – ಕನ್ನಡ ಸ್ವತಂತ್ರ ಡಿಜಿಟಲ್ ಪತ್ರಿಕೆ",
      description: "ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಕನ್ನಡದಲ್ಲಿ ಸ್ವತಂತ್ರ ಪತ್ರಿಕೋದ್ಯಮವನ್ನು ನಡೆದಂತೆ ತಲುಪಿಸುತ್ತದೆ.",
      creator: "@thehintnews",
      images: [`${siteUrl}/brand/logo.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch articles for global UI elements (Updated Indicator)
  let latestUpdate: string | undefined = undefined;

  try {
    const allArticles = await getAllArticles();
    // Latest update timestamp (from any article)
    latestUpdate = allArticles.length > 0 ? allArticles[0].publishedAt : undefined;
  } catch (error) {
    console.error('[RootLayout] Failed to fetch global article data:', error);
  }

  return (
    <html lang="kn" className={`${anekKannada.variable} ${tiroKannada.variable} ${notoSerifKannada.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="alternate" hrefLang="kn" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in'}/`} />
        <link rel="alternate" hrefLang="x-default" href={process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in'} />
      </head>
      <body className={`${playfairDisplay.variable} ${inter.variable}`}>
        <LanguageProvider>
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
