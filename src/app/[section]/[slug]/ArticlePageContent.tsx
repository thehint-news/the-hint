/**
 * Article Page Content (Shared Component)
 * 
 * Kannada article page content.
 */

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
    TagsList,
    ContinueReading,
} from '@/components/article';

import { getTranslationsForLang } from '@/lib/i18n';

interface ArticlePageContentProps {
    section: string;
    slug: string;
}

export async function generateArticleMetadata({
    section,
    slug,
}: { section: string; slug: string }) {
    const t = getTranslationsForLang('kn');

    let article;
    try {
        const data = await getArticlePageData(section, slug);
        article = data.article;
    } catch {
        return {
            title: t.errors.notFound,
            description: t.errors.notFoundDesc,
        };
    }

    const isoDate = new Date(article.publishedAt).toISOString();
    const isoUpdated = article.updatedAt ? new Date(article.updatedAt).toISOString() : isoDate;

    const canonicalUrl = `/${article.section}/${article.id}`;

    return {
        title: article.title,
        description: article.subtitle,
        keywords: article.tags,
        authors: [{ name: 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಸಂಪಾದಕೀಯ ಮಂಡಳಿ' }],
        alternates: {
            canonical: canonicalUrl,
        },
        robots: { index: true, follow: true },
        openGraph: {
            title: article.title,
            description: article.subtitle,
            type: 'article',
            publishedTime: isoDate,
            modifiedTime: isoUpdated,
            section: article.section,
            tags: article.tags,
            images: article.image ? [{ url: article.image, alt: article.title }] : [],
            url: canonicalUrl,
            locale: 'kn_IN',
            siteName: 'The Hint News',
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.subtitle,
            images: article.image ? [article.image] : [],
        },
    };
}

export async function ArticlePageContent({ section, slug }: ArticlePageContentProps) {
    // Fetch article data
    let articleData;
    try {
        articleData = await getArticlePageData(section, slug);
    } catch (error) {
        if (
            error instanceof ArticleNotFoundError ||
            error instanceof InvalidArticleSectionError ||
            error instanceof InvalidSlugError
        ) {
            notFound();
        }
        throw error;
    }

    const { article } = articleData;

    // Get recommendations
    const recommendations = await getContinueReadingArticles(article);

    // Prepare section label
    const sectionLabel = article.section
        .replace('-', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl.slice(0, -1) : rawSiteUrl;
    const canonicalUrl = `${siteUrl}/${article.section}/${article.id}`;

    // JSON-LD Structured Data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': article.contentType === 'opinion' ? 'OpinionNewsArticle' : 'NewsArticle',
                '@id': `${canonicalUrl}#article`,
                url: canonicalUrl,
                headline: article.title,
                description: article.subtitle,
                image: article.image ? [article.image] : [],
                datePublished: new Date(article.publishedAt).toISOString(),
                dateModified: new Date(article.updatedAt || article.publishedAt).toISOString(),
                author: [{
                    '@type': 'Organization',
                    name: 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಸಂಪಾದಕೀಯ ಮಂಡಳಿ',
                    url: siteUrl,
                }],
                publisher: {
                    '@type': 'NewsMediaOrganization',
                    '@id': 'https://www.thehintnews.in/#organization',
                    name: 'The Hint News',
                    logo: {
                        '@type': 'ImageObject',
                        url: 'https://www.thehintnews.in/brand/logo.png',
                        width: 512,
                        height: 512,
                    },
                },
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': canonicalUrl,
                },
                inLanguage: 'kn',
                isAccessibleForFree: true,
                articleSection: sectionLabel,
                keywords: article.tags?.join(', '),
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${canonicalUrl}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'ಮುಖಪುಟ',
                        item: siteUrl,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: sectionLabel,
                        item: `${siteUrl}/${article.section}`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: article.title,
                    },
                ],
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <article className="article-kannada-scope px-6 pt-12 pb-4 max-w-[1200px] mx-auto lg:pl-20">
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

                <div className="max-w-[760px] mx-auto">
                    <ArticleBody
                        blocks={article.bodyBlocks}
                        content={article.body}
                    />
                    <TagsList tags={article.tags || []} />
                    <SourcesList sources={article.sources || []} />
                </div>

                <div className="max-w-4xl mx-auto mt-8">
                    <ContinueReading
                        items={recommendations}
                    />
                </div>
            </article>
        </>
    );
}
