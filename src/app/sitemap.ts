import { MetadataRoute } from 'next';
import { getAllArticles, getValidSections } from '@/lib/content/reader';

// Generate sitemap dynamically (GitHub API calls at build time cause timeouts)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thehint.news';
    const currentDate = new Date().toISOString();

    // 1. Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'always',
            priority: 1.0,
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

    // 2. Section Pages
    const sections = getValidSections();
    const sectionRoutes: MetadataRoute.Sitemap = sections.map((section) => ({
        url: `${baseUrl}/${section}`,
        lastModified: currentDate,
        changeFrequency: 'hourly',
        priority: 0.9,
    }));

    // 3. Article Pages
    let articleRoutes: MetadataRoute.Sitemap = [];
    try {
        const allArticles = await getAllArticles();
        articleRoutes = allArticles.map((article) => ({
            url: `${baseUrl}/${article.section}/${article.id}`,
            lastModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date(article.publishedAt).toISOString(),
            changeFrequency: 'never', // News articles typically don't change
            priority: 0.8,
        }));
    } catch (error) {
        console.warn('Failed to generate article routes for sitemap:', error);
    }

    return [...staticRoutes, ...sectionRoutes, ...articleRoutes];
}
