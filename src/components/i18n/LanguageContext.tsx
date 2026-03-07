/**
 * Language Context Provider (Kannada Only)
 */

"use client";

import React, { createContext, useContext } from "react";
import { Language } from "@/lib/i18n";

interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
    isTransitioning: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>({
    language: 'kn',
    toggleLanguage: () => { }, // No-op
    isTransitioning: false,
});

interface LanguageProviderProps {
    children: React.ReactNode;
    initialLanguage?: Language;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    return (
        <LanguageContext.Provider value={{ language: 'kn', toggleLanguage: () => { }, isTransitioning: false }}>
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