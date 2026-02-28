/**
 * Article Page Content (Shared Component)
 * 
 * Shared between Kannada and English article routes.
 * Language is determined by the route (lang prop).
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
    ContinueReading,
} from '@/components/article';
import {
    applyArticleTranslation,
    getTranslationsForLang,
    hasEnglishTranslation,
    buildArticleHrefLang,
} from '@/lib/i18n';
import { Language } from '@/lib/i18n/language';

interface ArticlePageContentProps {
    section: string;
    slug: string;
    lang: Language;
}

export async function generateArticleMetadata({
    section,
    slug,
    lang,
}: ArticlePageContentProps & { siteUrl: string }) {
    const t = getTranslationsForLang(lang);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';

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

    // Check if English translation exists when requesting English
    if (lang === 'en' && !hasEnglishTranslation(article)) {
        return {
            title: t.errors.notFound,
            description: t.errors.notFoundDesc,
        };
    }

    // Apply translation if available
    const localizedArticle = applyArticleTranslation(article, lang);

    const isoDate = new Date(article.publishedAt).toISOString();
    const isoUpdated = article.updatedAt ? new Date(article.updatedAt).toISOString() : isoDate;

    // Build hreflang links
    const hrefLang = buildArticleHrefLang(article.section, article.id, siteUrl);

    // Canonical URL depends on language
    const canonicalUrl = lang === 'en'
        ? `/en/${article.section}/${article.id}`
        : `/${article.section}/${article.id}`;

    return {
        title: localizedArticle.title,
        description: localizedArticle.subtitle,
        keywords: article.tags,
        authors: [{ name: "The Hint Editorial Board" }],
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'kn': hrefLang.kn,
                'en': hrefLang.en,
                'x-default': hrefLang.xDefault,
            },
        },
        // Both languages indexable now (Phase 3)
        robots: { index: true, follow: true },
        openGraph: {
            title: localizedArticle.title,
            description: localizedArticle.subtitle,
            type: 'article',
            publishedTime: isoDate,
            modifiedTime: isoUpdated,
            section: article.section,
            tags: article.tags,
            images: article.image ? [{ url: article.image, alt: localizedArticle.title }] : [],
            url: canonicalUrl,
            locale: lang === 'kn' ? 'kn_IN' : 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title: localizedArticle.title,
            description: localizedArticle.subtitle,
            images: article.image ? [article.image] : [],
        },
    };
}

export async function ArticlePageContent({ section, slug, lang }: ArticlePageContentProps) {
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

    // For English route, check if translation exists
    if (lang === 'en' && !hasEnglishTranslation(article)) {
        notFound();
    }

    // Apply translation if available
    const localizedArticle = applyArticleTranslation(article, lang);

    // Get recommendations
    const recommendations = await getContinueReadingArticles(article);

    // Prepare section label
    const sectionLabel = article.section
        .replace('-', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const hrefLang = buildArticleHrefLang(article.section, article.id, siteUrl);

    // JSON-LD Structured Data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': article.contentType === 'opinion' ? 'OpinionNewsArticle' : 'NewsArticle',
                '@id': `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}#article`,
                url: `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}`,
                headline: localizedArticle.title,
                description: localizedArticle.subtitle,
                image: article.image ? [article.image] : [],
                datePublished: new Date(article.publishedAt).toISOString(),
                dateModified: new Date(article.updatedAt || article.publishedAt).toISOString(),
                author: [{
                    '@type': 'Organization',
                    name: 'The Hint Editorial Board',
                    url: siteUrl,
                }],
                publisher: {
                    '@type': 'Organization',
                    name: 'The Hint Editorial Board',
                    url: siteUrl,
                },
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}`,
                },
                inLanguage: lang === 'en' ? 'en' : 'kn',
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: lang === 'kn' ? 'ಮುಖಪುಟ' : 'Home',
                        item: siteUrl,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: sectionLabel,
                        item: `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: localizedArticle.title,
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

            {/* hreflang links for SEO */}
            <link rel="alternate" hrefLang="kn" href={hrefLang.kn} />
            <link rel="alternate" hrefLang="en" href={hrefLang.en} />
            <link rel="alternate" hrefLang="x-default" href={hrefLang.xDefault} />

            <article className={`${lang === 'kn' ? 'article-kannada-scope' : ''} px-6 pt-12 pb-4 max-w-[1200px] mx-auto`}>
                <div className="max-w-4xl mx-auto">
                    <ArticleHeader
                        title={localizedArticle.title}
                        subtitle={localizedArticle.subtitle}
                        sectionLabel={sectionLabel}
                        sectionSlug={article.section}
                        contentTypeLabel={article.contentType}
                        publishedAt={article.publishedAt}
                        updatedAt={article.updatedAt}
                    />
                </div>

                <div className="max-w-[760px] mx-auto">
                    <ArticleBody
                        blocks={lang === 'en' ? undefined : localizedArticle.bodyBlocks}
                        content={localizedArticle.body}
                    />
                </div>

                <div className="max-w-4xl mx-auto">
                    <SourcesList sources={article.sources} />
                </div>

                <div className="max-w-4xl mx-auto">
                    <ContinueReading
                        items={recommendations}
                    />
                </div>
            </article>
        </>
    );
}
