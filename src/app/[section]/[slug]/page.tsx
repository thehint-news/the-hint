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
import { ArticlePageWrapper } from '@/components/article';

// Allow ISR with dynamic fallback
export const dynamicParams = true;
export const revalidate = 300;

import { getArticleIndex } from '@/lib/contentLoader';

export async function generateStaticParams() {
    try {
        const index = await getArticleIndex();
        return index.map((article) => ({
            section: article.category,
            slug: article.slug,
        }));
    } catch (error) {
        console.error('Failed to generate static params:', error);
        return [];
    }
}

interface ArticlePageProps {
    params: Promise<{
        section: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { section, slug } = await params;
    return generateArticleMetadata({ section, slug });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { section, slug } = await params;

    return (
        <main className="w-full bg-white">
            <ArticlePageWrapper>
                <ArticlePageContent
                    section={section}
                    slug={slug}
                />
            </ArticlePageWrapper>
        </main>
    );
}
