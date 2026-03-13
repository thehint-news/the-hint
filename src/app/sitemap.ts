import { MetadataRoute } from 'next';
import { getValidSections } from '@/lib/content/reader';
import { getArticleIndex } from '@/lib/contentLoader';

// Use ISR for sitemap since we have API limits under control
export const revalidate = 300;

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
                    'x-default': baseUrl,
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

    // 2. Section Pages (Kannada)
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
                },
            },
        });
    }

    // 3. Article Pages (Kannada)
    const articleRoutes: MetadataRoute.Sitemap = [];
    try {
        const index = await getArticleIndex();

        for (const meta of index) {
            const lastModified = meta.date ? new Date(meta.date).toISOString() : currentDate;

            // Kannada article (always included)
            articleRoutes.push({
                url: `${baseUrl}/${meta.category}/${meta.slug}`,
                lastModified,
                changeFrequency: 'never',
                priority: 0.8,
                alternates: {
                    languages: {
                        kn: `${baseUrl}/${meta.category}/${meta.slug}`,
                    },
                },
            });
        }
    } catch (error) {
        console.warn('Failed to generate article routes for sitemap:', error);
    }

    return [...staticRoutes, ...sectionRoutes, ...articleRoutes];
}
