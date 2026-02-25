
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { kn } from "@/lib/i18n/kn";


// Define strict types for search results
interface SearchResult {
    headline: string;
    section: string;
    publishedAt: string;
    slug: string;
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);


    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            // Subtle delay for transition
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            document.body.style.overflow = "hidden";
            return () => clearTimeout(timer);
        } else {
            document.body.style.overflow = "unset";
            setQuery("");
            setResults([]);
            setHasSearched(false);
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Click outside to close
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results);
                    setHasSearched(true);
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsLoading(false);
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-all duration-300 flex justify-center items-start pt-0 md:pt-[10vh]"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full md:max-w-3xl bg-[#F7F6F2] shadow-2xl border-b border-[#111] md:border md:rounded-lg animate-in slide-in-from-top-4 duration-300 max-h-[100vh] md:max-h-[80vh] flex flex-col overflow-hidden">
                <div className="w-full">
                    {/* Header / Input Area */}
                    <div className="relative py-6 px-6 flex items-center gap-4 border-b border-[#E5E5E5]">
                        <div className="text-[#111]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={kn.search.placeholder}
                            className="flex-1 bg-transparent text-xl md:text-2xl font-serif text-[#111] placeholder:text-[#888] outline-none border-none p-0 tracking-tight"
                        />
                        <button
                            onClick={onClose}
                            className="bg-transparent text-[#111] hover:text-[#555] transition-colors p-2 -mr-2"
                            aria-label="Close search"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Results Area */}
                    <div className="overflow-y-auto custom-scrollbar bg-white flex-1 min-h-[50px]">
                        {query.length > 0 && isLoading && (
                            <div className="py-8 text-center animate-pulse">
                                <span className="font-sans text-xs text-[#888] uppercase tracking-widest">{kn.search.searching}</span>
                            </div>
                        )}

                        {!isLoading && hasSearched && results.length === 0 && (
                            <div className="py-12 text-center px-6">
                                <p className="font-serif text-lg text-[#111] mb-2">{kn.search.noResults}</p>
                                <p className="font-sans text-sm text-[#666]">{kn.search.adjustTerms}</p>
                            </div>
                        )}

                        {!isLoading && results.length > 0 && (
                            <ul className="divide-y divide-[#E5E5E5]">
                                {results.map((result) => (
                                    <li key={result.slug}>
                                        <Link
                                            href={`/${result.section}/${result.slug}`}
                                            onClick={onClose}
                                            className="block py-4 px-6 hover:bg-[#FAF9F6] transition-colors group"
                                        >
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#E53935]">
                                                        {(kn.sections as Record<string, string>)[result.section.toLowerCase().replace(" ", "-")] || result.section}
                                                    </span>
                                                    <span className="text-[#E5E5E5] text-[10px]">•</span>
                                                    <time className="font-sans text-[10px] text-[#888] uppercase tracking-wide">
                                                        {new Date(result.publishedAt).toLocaleDateString('kn-IN', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </time>
                                                </div>
                                                <h3 className="font-serif text-xl font-medium text-[#111] group-hover:underline decoration-1 underline-offset-4 leading-snug">
                                                    {result.headline}
                                                </h3>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Empty Initial State - Optional suggestions could go here */}
                        {!isLoading && !hasSearched && query.length === 0 && (
                            <div className="py-12 text-center opacity-40">
                                <p className="font-sans text-sm text-[#666]">{kn.search.typeToBegin}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Hint */}
                    <div className="hidden md:block py-2 px-4 bg-[#F7F6F2] border-t border-[#E5E5E5] text-right">
                        <span className="font-sans text-[10px] text-[#888] uppercase tracking-wide">
                            {kn.search.escToClose}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
}
