/**
 * Article Language Toggle
 * 
 * Premium, smooth, professional language toggle for article pages.
 * Positioned near share buttons for easy language switching.
 * 
 * Features:
 * - Elegant sliding animation between languages
 * - Professional glass-morphism design
 * - Accessible with keyboard navigation
 * - Responsive across all screen sizes
 */

"use client";

import { useLanguage } from "@/components/i18n/LanguageContext";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/i18n";

interface ArticleLanguageToggleProps {
    /** Optional additional CSS classes */
    className?: string;
    /** Compact mode for mobile */
    compact?: boolean;
}

/**
 * Premium Article Language Toggle
 * Professional sliding toggle with smooth animations
 */
export function ArticleLanguageToggle({
    className = "",
    compact = false,
}: ArticleLanguageToggleProps) {
    const { language, toggleLanguage, isTransitioning } = useLanguage();
    const isKannada = language === "kn";

    return (
        <div
            className={`
                relative inline-flex items-center
                bg-linear-to-r from-[#F8F8F8] to-[#F0F0F0]
                border border-[#E0E0E0]
                rounded-full
                p-1
                shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]
                hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)]
                transition-shadow duration-300 ease-out
                ${isTransitioning ? 'opacity-60' : 'opacity-100'}
                ${compact ? 'scale-90' : ''}
                ${className}
            `}
            role="group"
            aria-label="Select language"
        >
            {/* Sliding background pill */}
            <div
                className={`
                    absolute top-1 bottom-1
                    bg-white
                    rounded-full
                    shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]
                    transition-all duration-300 ease-in-out
                    ${isKannada ? 'left-1 w-[calc(50%-2px)]' : 'left-[calc(50%+1px)] w-[calc(50%-2px)]'}
                `}
                aria-hidden="true"
            />

            {/* Kannada Button */}
            <button
                type="button"
                onClick={isKannada ? undefined : toggleLanguage}
                disabled={isTransitioning}
                className={`
                    relative z-10
                    flex items-center justify-center
                    ${compact ? 'px-2.5 py-1' : 'px-4 py-1.5'}
                    text-xs font-semibold
                    tracking-wide
                    rounded-full
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-1
                    ${isKannada
                        ? 'text-[#111]'
                        : 'text-[#888] hover:text-[#555]'
                    }
                `}
                aria-pressed={isKannada}
                aria-label="Read in Kannada"
            >
                <span className={compact ? 'text-[10px]' : 'text-xs'}>
                    {LANGUAGE_DISPLAY_NAMES.kn}
                </span>
            </button>

            {/* English Button */}
            <button
                type="button"
                onClick={!isKannada ? undefined : toggleLanguage}
                disabled={isTransitioning}
                className={`
                    relative z-10
                    flex items-center justify-center
                    ${compact ? 'px-2.5 py-1' : 'px-4 py-1.5'}
                    text-xs font-semibold
                    tracking-wide
                    rounded-full
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-1
                    ${!isKannada
                        ? 'text-[#111]'
                        : 'text-[#888] hover:text-[#555]'
                    }
                `}
                aria-pressed={!isKannada}
                aria-label="Read in English"
            >
                <span className={compact ? 'text-[10px]' : 'text-xs'}>
                    {LANGUAGE_DISPLAY_NAMES.en}
                </span>
            </button>

            {/* Loading indicator during transition */}
            {isTransitioning && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                    <div className="w-3 h-3 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

/**
 * Compact Article Language Toggle
 * Ultra-compact version for very small spaces
 */
export function CompactArticleLanguageToggle({
    className = "",
}: ArticleLanguageToggleProps) {
    const { language, toggleLanguage, isTransitioning } = useLanguage();
    const isKannada = language === "kn";

    return (
        <button
            type="button"
            onClick={toggleLanguage}
            disabled={isTransitioning}
            className={`
                group
                relative inline-flex items-center gap-1.5
                bg-white
                border border-[#E0E0E0]
                hover:border-[#111]
                rounded-full
                px-2 py-1
                text-[10px] font-bold tracking-wider uppercase
                transition-all duration-200
                ${isTransitioning ? 'opacity-60' : 'opacity-100'}
                ${className}
            `}
            aria-label={`Switch to ${isKannada ? 'English' : 'Kannada'}`}
        >
            {/* Current Language */}
            <span className="text-[#111]">
                {isKannada ? 'ಕನ್ನಡ' : 'EN'}
            </span>

            {/* Divider */}
            <span className="w-px h-2.5 bg-[#E0E0E0] group-hover:bg-[#111] transition-colors" />

            {/* Target Language */}
            <span className="text-[#888] group-hover:text-[#111] transition-colors">
                {isKannada ? 'EN' : 'ಕನ್ನಡ'}
            </span>

            {/* Loading spinner */}
            {isTransitioning && (
                <span className="absolute inset-0 flex items-center justify-center bg-white rounded-full">
                    <span className="w-2.5 h-2.5 border-2 border-[#111] border-t-transparent rounded-full animate-spin" />
                </span>
            )}
        </button>
    );
}

export default ArticleLanguageToggle;