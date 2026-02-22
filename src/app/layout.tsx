import type { Metadata } from "next";
import { Playfair_Display, Inter, Noto_Sans_Kannada, Noto_Serif_Kannada } from "next/font/google";
import "./globals.css";
import { getAllArticles } from "@/lib/content/reader";

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

// Kannada sans-serif for body text — professional newspaper-grade
const notoSansKannada = Noto_Sans_Kannada({
  variable: "--font-kannada-sans",
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Kannada serif for headlines — authoritative, editorial
const notoSerifKannada = Noto_Serif_Kannada({
  variable: "--font-kannada-serif",
  subsets: ["kannada"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://thehint.news'),
  title: {
    default: "The Hint",
    template: "%s | The Hint",
  },
  description: "Independent journalism delivered as it happens. Authoritative news coverage with integrity and depth.",
  keywords: ["news", "politics", "world affairs", "crime", "court", "opinion", "journalism", "independent news"],
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
  openGraph: {
    title: "The Hint",
    description: "Independent journalism delivered as it happens. Authoritative news coverage with integrity and depth.",
    url: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://thehint.news'),
    siteName: "The Hint",
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Hint",
    description: "Independent journalism delivered as it happens.",
    creator: "@thehintnews", // Placeholder
  },
  verification: {
    // google: '...', // Placeholder for verification code
  },
};

import { Header, Footer } from "@/components/layout";
import { SubscribePopup } from "@/components/features/SubscribePopup";
import ScrollToTop from "@/components/features/ScrollToTop";
import Analytics from "@/components/analytics/Analytics";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch articles for global UI elements (Ticker, Updated Indicator)
  let tickerHeadlines: string[] = [];
  let latestUpdate: string | undefined = undefined;

  try {
    const allArticles = await getAllArticles();
    // Latest update timestamp (from any article)
    latestUpdate = allArticles.length > 0 ? allArticles[0].publishedAt : undefined;
    // Ticker headlines: No opinion, max 10, latest first
    tickerHeadlines = allArticles
      .filter(a => a.contentType !== 'opinion')
      .slice(0, 10)
      .map(a => a.title);
  } catch (error) {
    console.error('[RootLayout] Failed to fetch global article data:', error);
    // Fallback: Empty ticker, undefined update property
  }

  return (
    <html lang="en" className={`${notoSansKannada.variable} ${notoSerifKannada.variable}`}>
      <body className={`${playfairDisplay.variable} ${inter.variable}`}>
        <div className="min-h-screen flex flex-col">
          <Analytics />
          <Header latestUpdate={latestUpdate} tickerHeadlines={tickerHeadlines} />
          <ScrollToTop />
          {children}
          <Footer />
          <SubscribePopup />
        </div>
      </body>
    </html>
  );
}
