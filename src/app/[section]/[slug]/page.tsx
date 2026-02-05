/**
 * Article Page
 * 
 * Dynamic route for individual article pages.
 * Reads route params, calls data provider, and renders UI components.
 * 
 * NO editorial logic, NO formatting logic.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
    getArticlePageData,
    ArticleNotFoundError,
    InvalidArticleSectionError,
    InvalidSlugError,
} from '@/lib/content/article';
import { getContinueReadingArticles } from '@/lib/content/recommendations';
import {
    ArticleHeader,
    ArticleBody,
    SourcesList,
    CorrectionNotice,
    ContinueReading,
} from '@/components/article';

interface ArticlePageProps {
    params: Promise<{
        section: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { section, slug } = await params;

    let article;
    try {
        const data = getArticlePageData(section, slug);
        article = data.article;
    } catch {
        return {
            title: 'Article Not Found',
            description: 'The requested article could not be found.',
        };
    }

    const isoDate = new Date(article.publishedAt).toISOString();
    const isoUpdated = article.updatedAt ? new Date(article.updatedAt).toISOString() : isoDate;

    return {
        title: article.title,
        description: article.subtitle,
        authors: [{ name: "The Hint Editorial Board" }], // Or specific author if available
        openGraph: {
            title: article.title,
            description: article.subtitle,
            type: 'article',
            publishedTime: isoDate,
            modifiedTime: isoUpdated,
            section: article.section,
            tags: article.tags,
            images: article.image ? [{ url: article.image, alt: article.title }] : [],
            url: `/${article.section}/${article.id}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.subtitle,
            images: article.image ? [article.image] : [],
        },
    };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { section, slug } = await params;

    // Fetch article data
    let articleData;
    try {
        articleData = getArticlePageData(section, slug);
    } catch (error) {
        // Handle known error cases
        if (
            error instanceof ArticleNotFoundError ||
            error instanceof InvalidArticleSectionError ||
            error instanceof InvalidSlugError
        ) {
            notFound();
        }
        // Re-throw unexpected errors
        throw error;
    }

    const { article } = articleData;

    // Get recommendations
    const recommendations = getContinueReadingArticles(article);

    // Prepare section label (format slug to display name)
    const sectionLabel = article.section
        .replace('-', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // JSON-LD Structured Data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': article.contentType === 'opinion' ? 'OpinionNewsArticle' : 'NewsArticle',
        headline: article.title,
        description: article.subtitle,
        image: article.image ? [article.image] : [],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: [{
            '@type': 'Organization',
            name: 'The Hint Editorial Board',
            url: 'https://thehint.news'
        }],
        publisher: {
            '@type': 'Organization',
            name: 'The Hint',
            url: 'https://thehint.news',
            logo: {
                '@type': 'ImageObject',
                url: 'https://thehint.news/logo.png' // Replace with actual logo URL if available
            }
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://thehint.news/${article.section}/${article.id}`
        }
    };

    return (
        <main className="w-full bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <article className="px-6 py-12 max-w-[1200px] mx-auto">
                {/* Article Header (Section, Title, Subtitle, Meta, HR) */}
                <div className="max-w-4xl mx-auto">
                    <ArticleHeader
                        title={article.title}
                        subtitle={article.subtitle}
                        sectionLabel={sectionLabel}
                        contentTypeLabel={article.contentType}
                        publishedAt={article.publishedAt}
                        updatedAt={article.updatedAt}
                    />
                </div>

                {/* Featured Image - Narrower than full width, centered */}
                {article.image && (
                    <figure className="mb-10 max-w-4xl mx-auto">
                        <img
                            src={article.image}
                            alt={article.title} // Use title as fallback alt text
                            className="w-full h-auto object-cover max-h-[500px]"
                        />
                        {/* Caption support could be added here if data existed */}
                    </figure>
                )}

                {/* Article Body - Strict reading width */}
                <div className="max-w-[68ch] mx-auto">
                    <ArticleBody content={article.body} />

                    {/* Article Footer: Tags, Corrections, Sources */}
                    <div className="mt-8 pt-6 border-t border-[#D9D9D9]">
                        {/* Tags */}
                        {article.tags.length > 0 && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#8A8A8A] self-center mr-2">
                                    Topics:
                                </span>
                                {article.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs px-2 py-1 border border-[#D9D9D9] text-[#2B2B2B] hover:border-[#111111] transition-colors cursor-default"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Correction Notice */}
                        <CorrectionNotice updatedAt={article.updatedAt} />

                        {/* Sources */}
                        <SourcesList sources={article.sources} />
                    </div>
                </div>
            </article>

            {/* Continue Reading Section - Full Width */}
            {recommendations.length > 0 && (
                <ContinueReading items={recommendations} />
            )}
        </main>
    );
}
