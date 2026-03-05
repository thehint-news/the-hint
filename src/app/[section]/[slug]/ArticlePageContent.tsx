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
    TagsList,
    ContinueReading,
} from '@/components/article';
import { ShareButtons } from '@/components/article/ShareButtons';
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
    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl.slice(0, -1) : rawSiteUrl;

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

    // EnglishRoute Debug Log for metadata
    if (lang === 'en') {
        const hasTranslation = hasEnglishTranslation(article);
        console.log(`[EnglishRoute] Article exists: true`);
        console.log(`[EnglishRoute] Translation exists: ${hasTranslation}`);
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
        authors: [{ name: lang === 'kn' ? 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಸಂಪಾದಕೀಯ ಮಂಡಳಿ' : 'The Hint News Editorial Board' }],
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'kn': hrefLang.kn,
                'en': hrefLang.en,
                'x-default': hrefLang.xDefault,
            },
        },
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
            siteName: 'The Hint News',
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

    // For English route, log state but never 404 (prevent ISR caching 404s)
    if (lang === 'en') {
        const hasTranslation = hasEnglishTranslation(article);
        console.log(`[EnglishRoute] Article exists: true`);
        console.log(`[EnglishRoute] Translation exists: ${hasTranslation}`);

        // If no translation, we just proceed. `applyArticleTranslation` below 
        // will automatically apply the Kannada fallback.
    }

    // Apply translation if available
    const localizedArticle = applyArticleTranslation(article, lang);

    // Get recommendations
    const recommendations = await getContinueReadingArticles(article);

    // Prepare section label
    const sectionLabel = article.section
        .replace('-', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl.slice(0, -1) : rawSiteUrl;
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
                    name: lang === 'kn' ? 'ದಿ ಹಿಂಟ್ ನ್ಯೂಸ್ ಸಂಪಾದಕೀಯ ಮಂಡಳಿ' : 'The Hint News Editorial Board',
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
                    '@id': `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}`,
                },
                inLanguage: lang === 'en' ? 'en' : 'kn',
                isAccessibleForFree: true,
                articleSection: sectionLabel,
                keywords: article.tags?.join(', '),
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

    // Build current page URL for sharing
    const currentPageUrl = `${siteUrl}${lang === 'en' ? '/en' : ''}/${article.section}/${article.id}`;

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

            {/* Floating Share Buttons (Desktop) */}
            <ShareButtons
                title={localizedArticle.title}
                description={localizedArticle.subtitle}
                url={currentPageUrl}
                variant="floating"
            />

            <article className={`${lang === 'kn' ? 'article-kannada-scope' : ''} px-6 pt-12 pb-4 max-w-[1200px] mx-auto lg:pl-20`}>
                <div className="max-w-4xl mx-auto">
                    {lang === 'en' && article.translations?.en?.status === 'pending' && (
                        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                            ⏳ <strong>Translation in progress</strong> — The English version of this article will be available shortly. Showing original content in the meantime.
                        </div>
                    )}
                    {lang === 'en' && article.translations?.en?.status === 'failed' && (
                        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                            🔄 <strong>Translation pending</strong> — The English translation is being regenerated. Showing original content in the meantime.
                        </div>
                    )}
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
                    <TagsList tags={localizedArticle.tags} lang={lang} />
                    <SourcesList sources={localizedArticle.sources} lang={lang} />
                </div>

                <div className="max-w-4xl mx-auto mt-8">
                    <ContinueReading
                        items={recommendations}
                    />
                </div>
            </article>

            {/* Bottom Share Bar (Mobile) */}
            <ShareButtons
                title={localizedArticle.title}
                description={localizedArticle.subtitle}
                url={currentPageUrl}
                variant="bottom-bar"
            />
        </>
    );
}
