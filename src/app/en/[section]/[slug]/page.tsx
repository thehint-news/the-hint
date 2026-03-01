/**
 * English Article Page
 * 
 * Route: /en/[section]/[slug]
 * Renders English translation of articles.
 * Returns 404 if no English translation available.
 */

import { Metadata } from 'next';
import { ArticlePageContent, generateArticleMetadata } from '@/app/[section]/[slug]/ArticlePageContent';
import { SECONDARY_LANGUAGE } from '@/lib/i18n/language';
import { ArticlePageWrapper } from '@/components/article';

// Force dynamic rendering — GitHub API calls at build time cause timeouts
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface EnglishArticlePageProps {
    params: Promise<{
        section: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: EnglishArticlePageProps): Promise<Metadata> {
    const { section, slug } = await params;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    return generateArticleMetadata({ section, slug, lang: SECONDARY_LANGUAGE, siteUrl });
}

export default async function EnglishArticlePage({ params }: EnglishArticlePageProps) {
    const { section, slug } = await params;

    return (
        <main className="w-full bg-white">
            <ArticlePageWrapper>
                <ArticlePageContent
                    section={section}
                    slug={slug}
                    lang={SECONDARY_LANGUAGE}
                />
            </ArticlePageWrapper>
        </main>
    );
}
