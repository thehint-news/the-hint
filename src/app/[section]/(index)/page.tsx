/**
 * Kannada Section Page
 * 
 * Route: /[section]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSectionPageData, InvalidSectionError } from '@/lib/content';
import { SectionPageContent } from './SectionPageContent';
import { kn } from '@/lib/i18n';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface SectionPageProps {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<{
        page?: string;
    }>;
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
    const { section: sectionSlug } = await params;
    const t = kn;

    try {
        const { section } = await getSectionPageData(sectionSlug);

        const sectionName = (t.sections as Record<string, string>)[section.slug] || section.name;
        const sectionDesc = (t.sectionDescriptions as Record<string, string>)[section.slug] || section.description;

        return {
            title: `${sectionName} | ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್`,
            description: `${sectionDesc}. ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ನಲ್ಲಿ ಕರ್ನಾಟಕ ಮತ್ತು ವಿಶ್ವದ ಇತ್ತೀಚಿನ ${sectionName} ಸುದ್ದಿಗಳನ್ನು ಓದಿ.`,
            keywords: [sectionName, 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್', 'ಕನ್ನಡ ಸುದ್ದಿ', 'ಕರ್ನಾಟಕ ಸುದ್ದಿ', sectionName.toLowerCase()],
            alternates: {
                canonical: `/${section.slug}`,
            },
            robots: { index: true, follow: true },
            openGraph: {
                title: `${sectionName} | ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್`,
                description: sectionDesc,
                type: 'website',
                url: `/${section.slug}`,
                locale: 'kn_IN',
                siteName: 'The Hint News',
            },
        };
    } catch {
        return {
            title: t.errors.notFound,
        };
    }
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
    const { section: sectionSlug } = await params;
    const resolvedSearchParams = await searchParams;

    // Parse page number
    const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

    // Validate section exists
    try {
        await getSectionPageData(sectionSlug);
    } catch (error) {
        if (error instanceof InvalidSectionError) {
            notFound();
        }
        throw error;
    }

    return (
        <SectionPageContent
            sectionSlug={sectionSlug}
            currentPage={currentPage}
        />
    );
}
