/**
 * Header / Masthead Component
 * 
 * Classic broadsheet newspaper masthead with:
 * - Centered publication name "THE HINT"
 * - Date line
 * - Primary navigation
 * - Headline ticker band below navigation
 * - Live "Updated" indicator
 * 
 * NO icons, NO background fills, NO decorative elements
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SubscribeModal } from "../features/SubscribeModal";


const NAVIGATION_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Politics", href: "/politics" },
    { label: "World", href: "/world-affairs" },
    { label: "Crime", href: "/crime" },
    { label: "Court", href: "/court" },
    { label: "Opinion", href: "/opinion" },
] as const;

interface HeaderProps {
    latestUpdate?: string; // ISO timestamp of latest published article
    tickerHeadlines?: string[];
}

export function Header({ latestUpdate, tickerHeadlines = [] }: HeaderProps) {
    const [currentDate, setCurrentDate] = useState<string>("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
    const pathname = usePathname();

    // Format fixed date for masthead
    useEffect(() => {
        const formatted = new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        setCurrentDate(formatted);
    }, []);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMenuOpen]);

    // Format "Updated X ago"
    const getUpdatedString = (isoString?: string) => {
        if (!isoString) return "";
        const diff = Date.now() - new Date(isoString).getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "Updated just now";
        if (minutes < 60) return `Updated ${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Updated ${hours} hours ago`;
        return `Updated ${new Date(isoString).toLocaleDateString()}`;
    };

    const updatedString = latestUpdate ? getUpdatedString(latestUpdate) : "";

    // Hide Header on editorial console pages (they have their own toolbar)
    if (pathname?.startsWith('/publish') || pathname?.startsWith('/newsroom')) {
        return null;
    }

    return (
        <>
            <SubscribeModal isOpen={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />

            <header role="banner" className="sticky top-0 z-50 bg-[#F7F6F2]">
                {/* Skip Link for Accessibility */}
                <a href="#main-content" className="skip-link">
                    Skip to main content
                </a>

                {/* Mobile Menu 'News Index' Drawer */}
                <div className={`md:hidden ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                    {/* Transparent Backdrop */}
                    <div
                        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => setIsMenuOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Vertical Rail Menu */}
                    <div
                        className={`fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[300px] bg-[#F7F6F2] border-r border-[#111111] pt-4 pb-8 flex flex-col transform transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        <div className="px-6 pb-6 border-b border-[#D9D9D9] flex justify-between items-center">
                            <span className="font-serif font-black text-xl">The Hint</span>
                            <button onClick={() => setIsMenuOpen(false)} className="text-2xl leading-none">&times;</button>
                        </div>

                        {/* Mobile Links */}
                        <nav className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
                            {NAVIGATION_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="block font-sans text-lg font-medium text-[#111111] border-b border-[#E5E5E5] py-2"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}

                            <div className="pt-4 space-y-4">
                                <Link href="/" onClick={() => setIsMenuOpen(false)} className="block font-serif italic text-[#6B6B6B]">
                                    Today's Paper
                                </Link>
                                <button
                                    onClick={() => { setIsSubscribeOpen(true); setIsMenuOpen(false); }}
                                    className="w-full bg-[#111] text-[#F7F6F2] font-sans font-bold uppercase tracking-widest text-xs py-3 hover:bg-[#333] transition-colors mb-4"
                                >
                                    Subscribe for Updates
                                </button>
                            </div>
                        </nav>
                    </div>
                </div>

                {/* Utility Bar (Top Right Desktop) */}
                <div className="hidden md:flex justify-end items-center container-editorial py-1 gap-6 border-b border-[#E5E5E5]">
                    {updatedString && (
                        <span className="font-sans text-[10px] text-[#8A8A8A] uppercase tracking-wide">
                            {updatedString}
                        </span>
                    )}


                    <Link href="/" className="font-sans text-[11px] font-medium uppercase tracking-widest text-[#6B6B6B] hover:text-[#111]">
                        Today's Paper
                    </Link>
                </div>

                {/* Masthead */}
                <div className="container-editorial relative z-20 bg-[#F7F6F2]">
                    <div className="md:hidden flex justify-between items-center py-4 border-b border-[#111]">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 -ml-2"
                            aria-label="Open menu"
                        >
                            <div className="w-5 h-px bg-[#111] mb-1.5"></div>
                            <div className="w-5 h-px bg-[#111] mb-1.5"></div>
                            <div className="w-5 h-px bg-[#111]"></div>
                        </button>

                        <Link href="/" className="no-underline">
                            <h1 className="font-serif text-2xl font-black tracking-tight text-[#111] leading-none">THE HINT</h1>
                        </Link>

                        {/* Mobile Subscribe Icon Replacement or Spacer */}
                        <div className="w-5"></div>
                    </div>

                    {/* Desktop Masthead Content */}
                    <div className="hidden md:block pt-4 pb-2 text-center">
                        {currentDate && (
                            <time className="block font-sans text-xs font-medium text-[#6B6B6B] mb-2">
                                {currentDate}
                            </time>
                        )}
                        <Link href="/" className="inline-block no-underline">
                            <h1 className="masthead-title leading-none">The Hint</h1>
                        </Link>
                    </div>

                    {/* Divider */}
                    <hr className="hidden md:block border-t border-[#111] mt-2 mb-1" />

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex justify-between items-center py-2 relative">
                        <ul className="flex flex-1 justify-center gap-8 list-none m-0 p-0">
                            {NAVIGATION_ITEMS.map((item) => {
                                const isActive = item.href === '/'
                                    ? pathname === '/'
                                    : pathname?.startsWith(item.href);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`nav-link text-[13px] tracking-widest font-bold ${isActive ? 'text-[#111] after:scale-x-100' : 'text-[#444]'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Subscribe Button - Absolute Right */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <button
                                onClick={() => setIsSubscribeOpen(true)}
                                className="bg-[#111] text-[#F7F6F2] font-sans text-[11px] font-bold uppercase tracking-widest px-5 py-2 hover:bg-[#333] transition-colors shadow-sm"
                            >
                                Subscribe
                            </button>
                        </div>
                    </nav>


                </div>

                {/* News Ticker */}
                {tickerHeadlines.length > 0 && (
                    <div className="headline-ticker border-y border-[#111] py-1 bg-[#F7F6F2]">
                        <div className="container-editorial flex items-center">
                            <span className="font-sans text-[10px] font-black uppercase tracking-widest mr-4 text-[#E53935] whitespace-nowrap">
                                LATEST
                            </span>
                            <div className="flex-1 overflow-hidden relative">
                                <div
                                    className="ticker-container hover:pause"
                                    style={{ animationPlayState: isSubscribeOpen ? 'paused' : undefined }}
                                >
                                    {[...tickerHeadlines, ...tickerHeadlines].map((headline, idx) => (
                                        <Link
                                            key={`${idx}-${headline}`}
                                            href="/" // Ideally this would link to the specific article, but we strictly follow "Headlines scroll horizontally" and prop limitation for now.
                                            className="ticker-item hover:underline decoration-1 underline-offset-2"
                                        >
                                            {headline}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}

