/**
 * Language Toggle Component
 * 
 * Segmented switch for Kannada | English
 * Desktop: Right side of navbar
 * Mobile: Compact pill toggle in header
 * 
 * Uses React Context for language switching with full page reload.
 * Note: Full reload is required because / and /en have different root layouts.
 */

"use client";

import { LANGUAGE_DISPLAY_NAMES } from "@/lib/i18n";
import { useLanguage } from "./LanguageContext";

interface LanguageToggleProps {
    /** Variant style */
    variant?: "desktop" | "mobile" | "compact";
}

/**
 * Desktop segmented toggle
 */
function DesktopToggle() {
    const { language, toggleLanguage, isTransitioning } = useLanguage();

    return (
        <div
            className={`language-toggle-desktop ${isTransitioning ? 'opacity-50' : ''}`}
            role="group"
            aria-label="Select language"
        >
            <button
                type="button"
                onClick={language === "en" ? toggleLanguage : undefined}
                disabled={isTransitioning}
                className={`language-toggle-btn ${language === "kn" ? "active" : ""}`}
                aria-pressed={language === "kn"}
                aria-label="Switch to Kannada"
            >
                {LANGUAGE_DISPLAY_NAMES.kn}
            </button>
            <span className="language-toggle-divider" aria-hidden="true">|</span>
            <button
                type="button"
                onClick={language === "kn" ? toggleLanguage : undefined}
                disabled={isTransitioning}
                className={`language-toggle-btn ${language === "en" ? "active" : ""}`}
                aria-pressed={language === "en"}
                aria-label="Switch to English"
            >
                {LANGUAGE_DISPLAY_NAMES.en}
            </button>
        </div>
    );
}

/**
 * Mobile compact pill toggle
 */
function MobileToggle() {
    const { language, toggleLanguage, isTransitioning } = useLanguage();
    const otherLang = language === "kn" ? "en" : "kn";

    return (
        <button
            type="button"
            onClick={toggleLanguage}
            disabled={isTransitioning}
            className={`language-toggle-mobile ${isTransitioning ? 'opacity-50' : ''}`}
            aria-label={`Switch to ${LANGUAGE_DISPLAY_NAMES[otherLang]}`}
        >
            <span className="language-toggle-pill">
                <span className="current">{LANGUAGE_DISPLAY_NAMES[language]}</span>
                <span className="separator">→</span>
                <span className="target">{LANGUAGE_DISPLAY_NAMES[otherLang]}</span>
            </span>
        </button>
    );
}

/**
 * Ultra-compact toggle (for very small screens or crowded headers)
 */
function CompactToggle() {
    const { language, toggleLanguage, isTransitioning } = useLanguage();

    return (
        <button
            type="button"
            onClick={toggleLanguage}
            disabled={isTransitioning}
            className={`language-toggle-compact ${isTransitioning ? 'opacity-50' : ''}`}
            aria-label={`Current language: ${LANGUAGE_DISPLAY_NAMES[language]}. Click to toggle.`}
            title={`Current: ${LANGUAGE_DISPLAY_NAMES[language]}`}
        >
            {language.toUpperCase()}
        </button>
    );
}

/**
 * Main Language Toggle Component
 */
export function LanguageToggle({
    variant = "desktop",
}: LanguageToggleProps) {
    // Render appropriate variant
    switch (variant) {
        case "mobile":
            return <MobileToggle />;
        case "compact":
            return <CompactToggle />;
        case "desktop":
        default:
            return <DesktopToggle />;
    }
}

export default LanguageToggle;