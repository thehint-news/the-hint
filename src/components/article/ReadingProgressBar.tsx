'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ReadingProgressBarProps {
    /** Target container selector to measure article progress, defaults to 'article' */
    targetSelector?: string;
    /** Total reading time in minutes for companion widget calculation */
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
    readingTimeMinutes = 3 
}: ReadingProgressBarProps) {
    const progressRef = useRef<HTMLDivElement>(null);
    const pillProgressRef = useRef<HTMLSpanElement>(null);
    const pillRemainingRef = useRef<HTMLSpanElement>(null);
    const [showCompanion, setShowCompanion] = useState(false);
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
                setShowCompanion(false);
            }
            return;
        }

        // Distance scrolled into the article
        const scrolled = -rect.top;
        const rawProgress = scrolled / totalHeight;
        const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
        const percent = Math.round(clampedProgress * 100);
        const remainingMinutes = Math.max(1, Math.ceil((1 - clampedProgress) * readingTimeMinutes));

        // Update DOM transform directly for 60fps performance without React re-renders
        progressRef.current.style.transform = `scaleX(${clampedProgress})`;
        
        if (pillProgressRef.current) {
            pillProgressRef.current.textContent = `${percent}%`;
        }
        if (pillRemainingRef.current) {
            pillRemainingRef.current.textContent = `~${remainingMinutes} ನಿಮಿಷ ಬಾಕಿ`;
        }

        // Reveal companion pill past 20% scroll
        const shouldShow = clampedProgress > 0.20 && clampedProgress < 0.98;
        if (shouldShow !== isVisibleRef.current) {
            isVisibleRef.current = shouldShow;
            setShowCompanion(shouldShow);
        }
    }, [targetSelector, readingTimeMinutes]);

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

            {/* Floating Reading Companion Pill */}
            {showCompanion && (
                <div 
                    className="reading-companion-pill cursor-pointer select-none"
                    onClick={scrollToTop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToTop(); }}
                    aria-label="ಪುಟದ ಮೇಲಕ್ಕೆ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ"
                    title="ಮೇಲಕ್ಕೆ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ"
                >
                    <span className="text-[11px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                        <span ref={pillProgressRef} className="font-mono text-[12px] font-bold">20%</span>
                        <span className="text-[#888] font-normal font-serif">ಓದಾಗಿದೆ</span>
                        <span className="text-[#D0D0D0]">•</span>
                        <span ref={pillRemainingRef} className="text-[#666] font-medium text-[10px]">~{readingTimeMinutes} ನಿಮಿಷ ಬಾಕಿ</span>
                    </span>
                    <div className="reading-companion-btn" aria-hidden="true">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}
