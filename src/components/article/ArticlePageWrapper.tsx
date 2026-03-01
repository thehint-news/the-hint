/**
 * Article Page Wrapper
 * 
 * Client-side wrapper that manages the loading state for article pages.
 * Shows a premium skeleton loader during language transitions for smooth UX.
 * 
 * Features:
 * - Detects language transitions
 * - Shows skeleton loader during page load
 * - Smooth fade transitions between states
 * - Respects reduced motion preferences
 */

"use client";

import { useLanguage } from "@/components/i18n/LanguageContext";
import { ArticlePageSkeleton } from "@/components/skeleton";
import { ReactNode, useEffect, useState } from "react";

interface ArticlePageWrapperProps {
    children: ReactNode;
}

/**
 * Article Page Wrapper
 * Handles loading states and transitions for article pages
 */
export function ArticlePageWrapper({ children }: ArticlePageWrapperProps) {
    const { isTransitioning } = useLanguage();
    const [showSkeleton, setShowSkeleton] = useState(false);

    // Delay showing skeleton slightly to avoid flash for fast transitions
    useEffect(() => {
        if (isTransitioning) {
            // Small delay to ensure skeleton doesn't flash on fast connections
            const timer = setTimeout(() => {
                setShowSkeleton(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setShowSkeleton(false);
        }
    }, [isTransitioning]);

    return (
        <div className="relative min-h-screen">
            {/* Main content */}
            <div
                className={`
                    transition-opacity duration-500 ease-in-out
                    ${isTransitioning ? 'opacity-0' : 'opacity-100'}
                `}
            >
                {children}
            </div>

            {/* Skeleton loader overlay - shown during transitions */}
            {showSkeleton && (
                <div
                    className={`
                        fixed inset-0 z-50 bg-white
                        transition-opacity duration-300
                        ${isTransitioning ? 'opacity-100' : 'opacity-0'}
                    `}
                    style={{ top: '60px' }} // Account for sticky header
                >
                    <ArticlePageSkeleton />
                </div>
            )}
        </div>
    );
}

export default ArticlePageWrapper;