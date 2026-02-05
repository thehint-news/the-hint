import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thehint.news';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/newsroom/',
                '/preview/',
                '/api/',
                '/admin/',
                '/_next/',
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
