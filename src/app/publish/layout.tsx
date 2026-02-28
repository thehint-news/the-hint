/**
 * Publish Page Layout
 * Private editorial console - not for public access
 * 
 * Security:
 * - noindex, nofollow (never cached by search engines)
 * - Authentication middleware should be added here
 * 
 * This layout is ISOLATED from the main site layout:
 * - No site Header (masthead, ticker)
 * - No site Footer
 * - No SubscribePopup
 */

import type { Metadata } from 'next';
import { Playfair_Display, Inter, Noto_Sans_Kannada, Noto_Serif_Kannada } from 'next/font/google';
import '@/app/globals.css';

// Serif font for headlines
const playfairDisplay = Playfair_Display({
    variable: '--font-serif',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

// Sans-serif for body and UI
const inter = Inter({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

// Kannada sans-serif for body text
const notoSansKannada = Noto_Sans_Kannada({
    variable: '--font-kannada-sans',
    subsets: ['kannada'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

// Kannada serif for headlines
const notoSerifKannada = Noto_Serif_Kannada({
    variable: '--font-kannada-serif',
    subsets: ['kannada'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Publish | The Hint Editorial Console',
    description: 'Private editorial publishing console',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
        },
    },
};

export default function PublishLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // TODO: Add authentication middleware check here
    // In production, this should:
    // 1. Check for valid session/token
    // 2. Redirect unauthenticated users to login
    // 3. Log access attempts

    return (
        <html lang="kn" className={`${notoSansKannada.variable} ${notoSerifKannada.variable}`}>
            <body className={`${playfairDisplay.variable} ${inter.variable}`}>
                {children}
            </body>
        </html>
    );
}
