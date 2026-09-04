'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ReadingProgressBarProps {
    /** Target container selector to measure article progress, defaults to 'article' */
    targetSelector?: string;
    /** Optional reading time for backwards compatibility */
    readingTimeMinutes?: number;
}

/**
 * ReadingProgressBar & Companion Widget Component
 * 
 * High-end editorial reading progress indicator & companion pill:
 * - Ultra-thin ink progress line at top of viewport
 * - Floating frosted-glass reading companion pill with percentage & quick top jump
 * - Zero React re-renders on scroll (rAF + direct DOM style mutation)
 * - Full hydration safety & reduced-motion accessibility
 */
export function ReadingProgressBar({ 
    targetSelector = 'article',
}: ReadingProgressBarProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const isVisibleRef = useRef(false);
    const rafIdRef = useRef<number | null>(null);

    const updateProgress = useCallback(() => {
        const articleElement = document.querySelector(targetSelector);
        if (!articleElement || !progressRef.current) return;

        const rect = articleElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Article total scrollable height
        const totalHeight = rect.height - windowHeight;
        
        if (totalHeight <= 0) {
            progressRef.current.style.transform = 'scaleX(0)';
            if (isVisibleRef.current) {
                isVisibleRef.current = false;
                setShowScrollTop(false);
            }
            return;
        }

        // Distance scrolled into the article
        const scrolled = -rect.top;
        const rawProgress = scrolled / totalHeight;
        const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);

        // Update DOM transform directly for 60fps performance without React re-renders
        progressRef.current.style.transform = `scaleX(${clampedProgress})`;

        // Reveal scroll-to-top button past 15% scroll
        const shouldShow = clampedProgress > 0.15;
        if (shouldShow !== isVisibleRef.current) {
            isVisibleRef.current = shouldShow;
            setShowScrollTop(shouldShow);
        }
    }, [targetSelector]);

    const handleScroll = useCallback(() => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
            updateProgress();
            rafIdRef.current = null;
        });
    }, [updateProgress]);

    const scrollToTop = () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        updateProgress();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [handleScroll, updateProgress]);

    return (
        <>
            {/* Top Reading Progress Bar */}
            <div
                className="reading-progress-container"
                role="progressbar"
                aria-label="ಲೇಖನ ಓದುವ ಪ್ರಗತಿ"
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div ref={progressRef} className="reading-progress-fill" />
            </div>

            {/* Scroll to Top Arrow Button */}
            {showScrollTop && (
                <button 
                    type="button"
                    className="reading-companion-pill group"
                    onClick={scrollToTop}
                    aria-label="ಪುಟದ ಮೇಲಕ್ಕೆ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ"
                    title="ಮೇಲಕ್ಕೆ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform duration-200 group-hover:-translate-y-0.5"
                    >
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </button>
            )}
        </>
    );
}
