import { MetadataRoute } from 'next';
import { getAllArticles, getValidSections } from '@/lib/content/reader';
import { hasEnglishTranslation } from '@/lib/i18n';

// Generate sitemap dynamically (GitHub API calls at build time cause timeouts)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const currentDate = new Date().toISOString();

    // 1. Static Routes (Kannada)
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'always',
            priority: 1.0,
            alternates: {
                languages: {
                    kn: baseUrl,
                    en: `${baseUrl}/en`,
                },
            },
        },
        {
            url: `${baseUrl}/about`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: currentDate,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ];

    // 2. Section Pages (Kannada + English)
    const sections = getValidSections();
    const sectionRoutes: MetadataRoute.Sitemap = [];

    for (const section of sections) {
        // Kannada section
        sectionRoutes.push({
            url: `${baseUrl}/${section}`,
            lastModified: currentDate,
            changeFrequency: 'hourly',
            priority: 0.9,
            alternates: {
                languages: {
                    kn: `${baseUrl}/${section}`,
                    en: `${baseUrl}/en/${section}`,
                },
            },
        });

        // English section
        sectionRoutes.push({
            url: `${baseUrl}/en/${section}`,
            lastModified: currentDate,
            changeFrequency: 'hourly',
            priority: 0.9,
        });
    }

    // 3. Article Pages (Kannada + English with translations)
    const articleRoutes: MetadataRoute.Sitemap = [];
    try {
        const allArticles = await getAllArticles();

        for (const article of allArticles) {
            const lastModified = article.updatedAt
                ? new Date(article.updatedAt).toISOString()
                : new Date(article.publishedAt).toISOString();

            const hasEnglish = hasEnglishTranslation(article);

            // Kannada article (always included)
            articleRoutes.push({
                url: `${baseUrl}/${article.section}/${article.id}`,
                lastModified,
                changeFrequency: 'never',
                priority: 0.8,
                alternates: hasEnglish ? {
                    languages: {
                        kn: `${baseUrl}/${article.section}/${article.id}`,
                        en: `${baseUrl}/en/${article.section}/${article.id}`,
                    },
                } : undefined,
            });

            // English article (only if translation exists)
            if (hasEnglish) {
                articleRoutes.push({
                    url: `${baseUrl}/en/${article.section}/${article.id}`,
                    lastModified,
                    changeFrequency: 'never',
                    priority: 0.8,
                });
            }
        }
    } catch (error) {
        console.warn('Failed to generate article routes for sitemap:', error);
    }

    return [...staticRoutes, ...sectionRoutes, ...articleRoutes];
}
