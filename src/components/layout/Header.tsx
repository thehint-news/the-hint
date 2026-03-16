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
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SearchOverlay } from "../features/SearchOverlay";
import { en } from "@/lib/i18n/en";


const NAVIGATION_ITEMS = [
    { label: en.nav.home, href: "/" },
    { label: en.nav.local, href: "/local" },
    { label: en.nav.politics, href: "/politics" },
    { label: en.nav.world, href: "/world-affairs" },
    { label: en.nav.crime, href: "/crime" },
    { label: en.nav.court, href: "/court" },
    { label: en.nav.opinion, href: "/opinion" },
] as const;

interface HeaderProps {
    latestUpdate?: string; // ISO timestamp of latest published article
}

export function Header({ latestUpdate }: HeaderProps) {
    const [currentDate, setCurrentDate] = useState<string>("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const pathname = usePathname();

    // Format fixed date for masthead
    useEffect(() => {
        const formatted = new Date().toLocaleDateString("en-GB", {
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

        if (minutes < 1) return en.time.updatedJustNow;
        if (minutes < 60) return en.time.updatedMinutesAgo(minutes);
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return en.time.updatedHoursAgo(hours);
        return `${en.time.updatedOn}${new Date(isoString).toLocaleDateString("en-GB")}`;
    };

    const updatedString = latestUpdate ? getUpdatedString(latestUpdate) : "";

    // Hide Header on editorial console pages (they have their own toolbar)
    if (pathname?.startsWith('/publish') || pathname?.startsWith('/newsroom')) {
        return null;
    }

    return (
        <>
            <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <header role="banner" className="sticky top-0 z-50 bg-[#F7F6F2]">
                {/* Skip Link for Accessibility */}
                <a href="#main-content" className="skip-link">
                    {en.nav.skipToMain}
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
                        className={`fixed inset-y-0 left-0 z-40 w-[85vw] sm:w-[70vw] max-w-[320px] sm:max-w-[360px] bg-[#F7F6F2] border-r border-[#111111] flex flex-col transform transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        {/* Drawer Header */}
                        <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 flex justify-between items-start">
                            <div className="flex flex-col gap-3">
                                <div className="h-[72px] sm:h-[84px] ml-0.5 mt-1">
                                    <Image
                                        src="/brand/logo.png"
                                        alt={en.brand.name}
                                        width={432}
                                        height={607}
                                        className="h-full w-auto object-contain object-left"
                                        style={{ mixBlendMode: 'multiply', filter: 'grayscale(1) brightness(1.1) contrast(1.1)' }}
                                    />
                                </div>
                                <span className="font-sans text-[10px] font-medium text-[#666] uppercase tracking-wide pl-0.5">
                                    {currentDate}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 -mr-2 text-[#111] opacity-60 hover:opacity-100 transition-opacity touch-manipulation"
                                aria-label="Close menu"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search Field Stylized Button */}
                        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                            <button
                                onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 bg-white border border-[#E5E5E5] px-3 py-2.5 text-[#888] hover:border-[#111] hover:text-[#111] transition-colors group shadow-sm touch-manipulation"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#AAA] group-hover:text-[#111] transition-colors">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="font-sans text-xs font-medium pt-0.5">{en.nav.searchPlaceholder}</span>
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex-1 overflow-y-auto px-4 sm:px-6">
                            <ul className="space-y-0 border-t border-[#E5E5E5]/60">
                                {NAVIGATION_ITEMS.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="block font-serif text-sm sm:text-base text-[#111] py-2.5 border-b border-[#E5E5E5]/60 hover:pl-3 transition-all duration-300 touch-manipulation"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>


                        </nav>
                    </div>
                </div>

                {/* Utility Bar (Top Right Desktop) */}
                <div className="hidden md:flex justify-end items-center container-editorial py-0.5 gap-3 lg:gap-6 border-b border-[#E5E5E5]">
                    {updatedString && (
                        <span className="font-sans text-[9px] text-[#8A8A8A] uppercase tracking-wide hidden sm:inline">
                            {updatedString}
                        </span>
                    )}

                    <Link href="/" className="font-sans text-[9px] font-medium uppercase tracking-widest text-[#6B6B6B] hover:text-[#111] whitespace-nowrap">
                        {en.nav.todaysPaper}
                    </Link>
                </div>

                {/* Masthead */}
                <div className="container-editorial relative z-20 bg-[#F7F6F2]">
                    {/* Mobile Header (below md: 768px) */}
                    <div className="md:hidden flex justify-between items-center py-1.5 sm:py-2 border-b border-[#111]">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1.5 -ml-1.5 touch-manipulation"
                            aria-label="Open menu"
                        >
                            <div className="w-4 h-px bg-[#111] mb-1"></div>
                            <div className="w-4 h-px bg-[#111] mb-1"></div>
                            <div className="w-4 h-px bg-[#111]"></div>
                        </button>

                        <Link href="/" className="no-underline flex-1 flex justify-center relative z-10">
                            <div className="w-[220px] sm:w-[280px] flex items-center justify-center -mt-6 -mb-8 sm:-mt-8 sm:-mb-10">
                                <Image
                                    src="/brand/header-logo.png"
                                    alt={en.brand.name}
                                    priority
                                    width={1280}
                                    height={706}
                                    className="w-full h-auto object-contain"
                                    style={{ mixBlendMode: 'multiply', filter: 'grayscale(1) brightness(1.1) contrast(1.1)' }}
                                />
                            </div>
                        </Link>

                        {/* Mobile Search */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-2 -mr-2 text-[#111] touch-manipulation"
                                aria-label="Search"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Bar - Horizontal Scrollable */}
                    <nav className="md:hidden border-t border-[#E5E5E5] bg-[#F7F6F2]">
                        <div className="overflow-x-auto scrollbar-hide">
                            <ul className="flex items-center gap-1 px-2 py-1.5 min-w-max">
                                {NAVIGATION_ITEMS.map((item) => {
                                    const isActive = item.href === '/'
                                        ? pathname === '/'
                                        : pathname?.startsWith(item.href);

                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={`block px-2.5 py-1 font-sans text-[11px] font-medium rounded-full whitespace-nowrap transition-colors touch-manipulation ${isActive
                                                    ? 'bg-[#111] text-[#F7F6F2]'
                                                    : 'text-[#444] hover:bg-[#E5E5E5]'
                                                    }`}
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </nav>

                    {/* Tablet & Desktop Masthead Content (md and above: 768px+) */}
                    <div className="hidden md:flex flex-col items-center pt-0 pb-0 text-center">
                        {currentDate && (
                            <time className="block font-sans text-[10px] lg:text-[11px] font-medium text-[#6B6B6B] mt-1 lg:mt-2 mb-0 uppercase tracking-wider relative z-10">
                                {currentDate}
                            </time>
                        )}
                        <Link href="/" className="inline-block no-underline hover:opacity-90 transition-opacity">
                            <div className="w-[320px] md:w-[400px] lg:w-[500px] xl:w-[580px] mx-auto flex items-center justify-center -mt-12 -mb-6 lg:-mt-24 lg:-mb-16 xl:-mt-28 xl:-mb-20">
                                <Image
                                    src="/brand/header-logo.png"
                                    alt={en.brand.name}
                                    priority
                                    width={1280}
                                    height={706}
                                    className="w-full h-auto object-contain"
                                    style={{ mixBlendMode: 'multiply', filter: 'grayscale(1) brightness(1.1) contrast(1.1)' }}
                                />
                            </div>
                        </Link>
                    </div>

                    {/* Divider */}
                    <hr className="hidden md:block border-t border-[#111] mt-0.5 mb-0.5" />

                    {/* Tablet & Desktop Navigation (md and above: 768px+) */}
                    <nav className="hidden md:flex justify-between items-center py-1 relative">
                        <ul className="flex flex-1 justify-center gap-4 lg:gap-6 xl:gap-8 list-none m-0 p-0 px-4 lg:px-0">
                            {NAVIGATION_ITEMS.map((item) => {
                                const isActive = item.href === '/'
                                    ? pathname === '/'
                                    : pathname?.startsWith(item.href);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`nav-link text-[11px] lg:text-[13px] tracking-widest font-bold whitespace-nowrap ${isActive ? 'text-[#111] after:scale-x-100' : 'text-[#444]'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Search & Subscribe - Responsive positioning */}
                        <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-2 xl:gap-4">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-full text-[#444] hover:bg-[#E5E5E5] hover:text-[#111] transition-all duration-200 group"
                                aria-label="Search"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span className="font-sans text-[11px] font-bold uppercase tracking-widest hidden xl:inline">
                                    {en.nav.searchButton}
                                </span>
                            </button>

                        </div>
                    </nav>

                    {/* Mobile/Tablet Search Bar (md only: 768px-1024px) */}
                    <div className="hidden md:flex lg:hidden justify-end items-center gap-3 py-2 border-t border-[#E5E5E5]">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-full text-[#444] hover:bg-[#E5E5E5] hover:text-[#111] transition-all duration-200 group"
                            aria-label="Search"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <span className="font-sans text-[11px] font-bold uppercase tracking-widest">
                                {en.nav.searchButton}
                            </span>
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
}
