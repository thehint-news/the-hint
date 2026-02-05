"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SubscribeModal } from "../features/SubscribeModal";

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
                                <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#e5e5e5] uppercase mb-3">
                                    The Hint
                                </h2>
                                <p className="font-serif text-[15px] text-[#888] italic leading-relaxed mb-4">
                                    Independent journalism<br />delivered as it happens.
                                </p>
                                <button
                                    onClick={() => setIsSubscribeOpen(true)}
                                    className="bg-[#F7F6F2] text-[#111] font-sans text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 hover:bg-[#e5e5e5] transition-colors"
                                >
                                    Subscribe
                                </button>
                            </div>

                            {/* Column 2: Sections (2x3 Grid) */}
                            <div className="text-center">
                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    Sections
                                </h3>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 max-w-[180px] mx-auto">
                                    <Link href="/" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Home
                                    </Link>
                                    <Link href="/crime" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Crime
                                    </Link>
                                    <Link href="/politics" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Politics
                                    </Link>
                                    <Link href="/court" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Court
                                    </Link>
                                    <Link href="/world" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        World
                                    </Link>
                                    <Link href="/opinion" className="font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Opinion
                                    </Link>
                                </div>
                            </div>

                            {/* Column 3: Company & Legal (Stacked) */}
                            <div className="text-center md:text-right">
                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    Company
                                </h3>
                                <div className="space-y-1.5 mb-5">
                                    <Link href="/about" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        About Us
                                    </Link>
                                    <Link href="/contact" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Contact
                                    </Link>
                                </div>

                                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#e5e5e5] mb-3">
                                    Legal
                                </h3>
                                <div className="space-y-1.5">
                                    <Link href="/terms" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Terms
                                    </Link>
                                    <Link href="/privacy" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Privacy
                                    </Link>
                                    <Link href="/unsubscribe" className="block font-sans text-[13px] text-[#999] hover:text-[#e5e5e5] transition-colors">
                                        Unsubscribe
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
                                © 2026 The Hint. All rights reserved.
                            </p>
                        </address>
                    </div>
                </div>

            </footer>
        </>
    );
}
