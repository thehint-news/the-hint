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

// Allow ISR with dynamic fallback
export const dynamicParams = true;
export const revalidate = 60;

import { getAllArticles } from '@/lib/content/reader';

export async function generateStaticParams() {
    try {
        const articles = await getAllArticles();
        return articles.map((article) => ({
            section: article.section,
            slug: article.id,
        }));
    } catch (error) {
        console.error('Failed to generate static params (English route):', error);
        return [];
    }
}

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
