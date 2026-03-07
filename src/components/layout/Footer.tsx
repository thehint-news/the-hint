"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SubscribeModal } from "../features/SubscribeModal";
import { kn } from "@/lib/i18n/kn";

/**
 * Footer Component
 * 
 * Hybrid layout: Columns + Rows for balanced newspaper footer.
 * Editorial, calm, authoritative.
 */
export function Footer() {
    const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

    const pathname = usePathname();

    // Hide Footer on editorial console pages
    if (pathname?.startsWith('/publish') || pathname?.startsWith('/newsroom')) {
        return null;
    }

    return (
        <>
            <SubscribeModal isOpen={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />

            <footer className="bg-[#1a1a1a] text-[#b3b3b3]">

                {/* Upper Section - 3 Column Layout */}
                <div className="border-b border-[#2a2a2a]">
                    <div className="max-w-6xl mx-auto px-6 py-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">

                            {/* Column 1: Brand & Subscribe */}
                            <div className="text-center md:text-left">
                                <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-1">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#e5e5e5]" style={{ fontFamily: 'var(--font-serif)' }}>
                                        {kn.brand.name}
                                    </h2>
                                </Link>
                                <p className="font-sans text-[13px] text-[#999] tracking-wide mb-6">
                                    Digital Kannada Newspaper
                                </p>
                                <button
                                    onClick={() => setIsSubscribeOpen(true)}
                                    className="bg-[#F7F6F2] text-[#111] font-sans text-sm font-bold uppercase tracking-widest px-5 py-2.5 hover:bg-[#e5e5e5] transition-colors"
                                >
                                    {kn.nav.subscribeDesktopButton}
                                </button>
                            </div>

                            {/* Column 2: Sections (2x3 Grid) */}
                            <div className="text-center">
                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    {kn.footer.sections}
                                </h3>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 max-w-[180px] mx-auto">
                                    <Link href="/local" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.local}
                                    </Link>
                                    <Link href="/crime" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.crime}
                                    </Link>
                                    <Link href="/politics" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.politics}
                                    </Link>
                                    <Link href="/court" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.court}
                                    </Link>
                                    <Link href="/world-affairs" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.world}
                                    </Link>
                                    <Link href="/opinion" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.nav.opinion}
                                    </Link>
                                </div>
                            </div>

                            {/* Column 3: Company & Legal (Stacked) */}
                            <div className="text-center md:text-right">
                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    {kn.footer.company}
                                </h3>
                                <div className="space-y-1.5 mb-5">
                                    <Link href="/about" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.footer.about}
                                    </Link>
                                    <Link href="/contact" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.footer.contact}
                                    </Link>
                                </div>

                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    {kn.footer.legal}
                                </h3>
                                <div className="space-y-1.5">
                                    <Link href="/terms" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.footer.terms}
                                    </Link>
                                    <Link href="/privacy" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.footer.privacy}
                                    </Link>
                                    <Link href="/unsubscribe" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        {kn.footer.unsubscribe}
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Lower Section - Horizontal Row: Copyright */}
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                        <address className="not-italic">
                            <p className="font-sans text-[14px] text-[#666]">
                                {kn.brand.copyright}
                            </p>
                        </address>
                    </div>
                </div>

            </footer>
        </>
    );
}
