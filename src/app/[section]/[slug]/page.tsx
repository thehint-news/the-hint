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
    ContinueReading,
} from '@/components/article';

// Force dynamic rendering — GitHub API calls at build time cause timeouts
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

    let article;
    try {
        const data = await getArticlePageData(section, slug);
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
        keywords: article.tags,
        authors: [{ name: "The Hint Editorial Board" }], // Or specific author if available
        alternates: {
            canonical: `/${article.section}/${article.id}`,
        },
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
        articleData = await getArticlePageData(section, slug);
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
    const recommendations = await getContinueReadingArticles(article);

    // Prepare section label (format slug to display name)
    const sectionLabel = article.section
        .replace('-', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // JSON-LD Structured Data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': article.contentType === 'opinion' ? 'OpinionNewsArticle' : 'NewsArticle',
                '@id': `https://www.thehintnews.in/${article.section}/${article.id}#article`,
                url: `https://www.thehintnews.in/${article.section}/${article.id}`,
                headline: article.title,
                description: article.subtitle,
                image: article.image ? [article.image] : [],
                datePublished: new Date(article.publishedAt).toISOString(),
                dateModified: new Date(article.updatedAt || article.publishedAt).toISOString(),
                author: [{
                    '@type': 'Organization',
                    name: 'The Hint Editorial Board',
                    url: 'https://www.thehintnews.in/'
                }],
                publisher: {
                    '@type': 'Organization',
                    name: 'The Hint Editorial Board',
                    url: 'https://www.thehintnews.in/',
                },
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': `https://www.thehintnews.in/${article.section}/${article.id}`
                },
                inLanguage: 'kn'
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `https://www.thehintnews.in/${article.section}/${article.id}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'ಮುಖಪುಟ',
                        item: 'https://www.thehintnews.in/'
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: sectionLabel,
                        item: `https://www.thehintnews.in/${article.section}`
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: article.title
                    }
                ]
            }
        ]
    };

    return (
        <main className="w-full bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <article className="article-kannada-scope px-6 pt-12 pb-4 max-w-[1200px] mx-auto">
                {/* Article Header (Section, Title, Subtitle, Meta, HR) */}
                <div className="max-w-4xl mx-auto">
                    <ArticleHeader
                        title={article.title}
                        subtitle={article.subtitle}
                        sectionLabel={sectionLabel}
                        sectionSlug={article.section}
                        contentTypeLabel={article.contentType}
                        publishedAt={article.publishedAt}
                        updatedAt={article.updatedAt}
                    />
                </div>

                {/* Article Body - Strict reading width */}
                {/* Thumbnail is NOT displayed here - it's only for cards and social sharing */}
                <div className="max-w-[68ch] mx-auto">
                    <ArticleBody
                        content={article.body}
                        blocks={article.bodyBlocks}
                    />


                    {/* Article Footer: Tags, Corrections, Sources */}
                    <div style={{ marginTop: '2.5rem', borderTop: '1px solid #D9D9D9', paddingTop: '1.5rem' }}>
                        {/* Keywords - Clean, minimal design */}
                        {article.tags.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                {/* Simple label */}
                                <span style={{
                                    fontFamily: 'var(--font-sans-full)',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: '#595959',
                                    display: 'block',
                                    marginBottom: '0.75rem',
                                }}>
                                    Keywords
                                </span>
                                {/* Clean tag list */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {article.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="keyword-tag"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

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
