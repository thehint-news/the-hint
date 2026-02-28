/**
 * English Section Page
 * 
 * Route: /en/[section]
 * Renders English translations of section articles.
 */

import { Metadata } from 'next';
import { getSectionPageData } from '@/lib/content';
import { SectionPageContent } from '@/app/[section]/(index)/SectionPageContent';
import {
    getTranslationsForLang,
    buildSectionHrefLang,
} from '@/lib/i18n';
import { SECONDARY_LANGUAGE } from '@/lib/i18n/language';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface EnglishSectionPageProps {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<{
        page?: string;
    }>;
}

export async function generateMetadata({ params }: EnglishSectionPageProps): Promise<Metadata> {
    const { section: sectionSlug } = await params;
    const lang = SECONDARY_LANGUAGE;
    const t = getTranslationsForLang(lang);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

    try {
        const { section } = await getSectionPageData(sectionSlug);

        const sectionName = (t.sections as Record<string, string>)[section.slug] || section.name;
        const sectionDesc = (t.sectionDescriptions as Record<string, string>)[section.slug] || section.description;

        const hrefLang = buildSectionHrefLang(section.slug, siteUrl);

        return {
            title: `${sectionName} News`,
            description: sectionDesc,
            alternates: {
                canonical: `/en/${section.slug}`,
                languages: {
                    'kn': hrefLang.kn,
                    'en': hrefLang.en,
                    'x-default': hrefLang.xDefault,
                },
            },
            // Both languages indexable now (Phase 3)
            robots: { index: true, follow: true },
            openGraph: {
                title: `${sectionName} News | ${t.brand.name}`,
                description: sectionDesc,
                type: 'website',
                url: `/en/${section.slug}`,
                locale: 'en_US',
            },
        };
    } catch {
        return {
            title: t.errors.notFound,
        };
    }
}

export default async function EnglishSectionPage({ params, searchParams }: EnglishSectionPageProps) {
    const { section: sectionSlug } = await params;
    const resolvedSearchParams = await searchParams;

    // Parse page number
    const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

    return (
        <SectionPageContent
            sectionSlug={sectionSlug}
            currentPage={currentPage}
            lang={SECONDARY_LANGUAGE}
        />
    );
}
