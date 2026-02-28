/**
 * Language Context Provider
 * 
 * Manages language state across the application.
 * Works with Next.js App Router for smooth language switching.
 * 
 * Features:
 * - Route-based language detection (/en routes are English)
 * - Smooth client-side navigation between languages
 * - No hydration mismatch
 * - Single root layout handles both languages
 */

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Language,
    getToggleLanguage,
    setClientLanguage,
} from "@/lib/i18n";

interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
    isTransitioning: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: React.ReactNode;
    initialLanguage: Language;
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [language, setLanguage] = useState<Language>(initialLanguage);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Sync with route pathname (for client-side route changes)
    useEffect(() => {
        const isEnglishRoute = pathname?.startsWith('/en');
        const routeLang: Language = isEnglishRoute ? 'en' : 'kn';
        if (routeLang !== language) {
            setLanguage(routeLang);
        }
    }, [pathname, language]);

    const toggleLanguage = useCallback(() => {
        if (isTransitioning) return;

        const newLang = getToggleLanguage(language);
        setIsTransitioning(true);

        // Update cookie for server-side consistency
        setClientLanguage(newLang);

        // Calculate the target URL based on current path
        const currentPath = window.location.pathname;
        let targetPath: string;

        if (newLang === 'en') {
            // Switching to English - add /en prefix
            targetPath = currentPath.startsWith('/en') ? currentPath : `/en${currentPath}`;
        } else {
            // Switching to Kannada - remove /en prefix
            targetPath = currentPath.replace(/^\/en/, '') || '/';
        }

        // Update local state immediately for UI feedback
        setLanguage(newLang);

        // Navigate using Next.js router for smooth client-side transition
        // (Now works correctly because we have a single root layout)
        router.push(targetPath);

        setIsTransitioning(false);
    }, [language, isTransitioning, router]);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, isTransitioning }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

export default LanguageContext;