/**
 * Kannada Article Page
 * 
 * Route: /[section]/[slug]
 * Default language (Kannada) article page.
 * 
 * NO editorial logic, NO formatting logic.
 */

import { Metadata } from 'next';
import { ArticlePageContent, generateArticleMetadata } from './ArticlePageContent';
import { DEFAULT_LANGUAGE } from '@/lib/i18n/language';
import { ArticlePageWrapper } from '@/components/article';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface ArticlePageProps {
    params: Promise<{
        section: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { section, slug } = await params;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    return generateArticleMetadata({ section, slug, lang: DEFAULT_LANGUAGE, siteUrl });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { section, slug } = await params;

    return (
        <main className="w-full bg-white">
            <ArticlePageWrapper>
                <ArticlePageContent
                    section={section}
                    slug={slug}
                    lang={DEFAULT_LANGUAGE}
                />
            </ArticlePageWrapper>
        </main>
    );
}
