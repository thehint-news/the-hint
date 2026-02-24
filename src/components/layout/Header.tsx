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
import { SearchOverlay } from "../features/SearchOverlay";


const NAVIGATION_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Local", href: "/local" },
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
    const [isSearchOpen, setIsSearchOpen] = useState(false);
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
            <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

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

                    {/* Vertical Rail Menu - Redesigned */}
                    <div
                        className={`fixed inset-y-0 left-0 z-40 w-[90vw] max-w-[360px] bg-[#F7F6F2] border-r border-[#111111] flex flex-col transform transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        {/* Drawer Header */}
                        <div className="px-6 pt-8 pb-6 flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="font-serif text-3xl font-black tracking-tight leading-none text-[#111]">
                                    The Hint
                                </span>
                                <span className="font-sans text-[11px] font-medium text-[#666] uppercase tracking-wide pl-0.5">
                                    {currentDate}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 -mr-2 text-[#111] opacity-60 hover:opacity-100 transition-opacity"
                                aria-label="Close menu"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search Field Stylized Button */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 bg-white border border-[#E5E5E5] px-4 py-3 text-[#888] hover:border-[#111] hover:text-[#111] transition-colors group shadow-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#AAA] group-hover:text-[#111] transition-colors">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="font-sans text-sm font-medium pt-0.5">Search coverage...</span>
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex-1 overflow-y-auto px-6">
                            <ul className="space-y-0 border-t border-[#E5E5E5]/60">
                                {NAVIGATION_ITEMS.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="block font-serif text-lg text-[#111] py-3 border-b border-[#E5E5E5]/60 hover:pl-3 transition-all duration-300"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-8 mb-8 space-y-6">
                                <Link
                                    href="/"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-widest text-[#6B6B6B] hover:text-[#111] group"
                                >
                                    See what others miss
                                    <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">→</span>
                                </Link>

                                <button
                                    onClick={() => { setIsSubscribeOpen(true); setIsMenuOpen(false); }}
                                    className="w-full bg-[#111] text-[#F7F6F2] font-sans font-bold uppercase tracking-widest text-xs py-4 hover:bg-[#333] transition-colors shadow-sm"
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
                        Today&apos;s Paper
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
                        {/* Mobile Search Icon */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 -mr-2 text-[#111]"
                            aria-label="Search"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
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

                        {/* Search & Subscribe - Separate Actions */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-full text-[#444] hover:bg-[#E5E5E5] hover:text-[#111] transition-all duration-200 group"
                                aria-label="Search"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="font-sans text-[11px] font-bold uppercase tracking-widest">
                                    Search
                                </span>
                            </button>

                            <button
                                onClick={() => setIsSubscribeOpen(true)}
                                className="bg-[#111] text-[#F7F6F2] font-sans text-[11px] font-bold uppercase tracking-widest px-6 py-2 rounded-full hover:bg-[#333] transition-colors shadow-sm"
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

