
import { NextResponse } from 'next/server';
import { getAllArticles } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const allArticles = getAllArticles();
        const lowerQuery = query.toLowerCase();

        const results = allArticles
            .filter(article => {
                const titleMatch = article.title.toLowerCase().includes(lowerQuery);
                // Also search in subtitle/deck if available, and tags
                const subtitleMatch = article.subtitle?.toLowerCase().includes(lowerQuery);
                const tagMatch = article.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

                return titleMatch || subtitleMatch || tagMatch;
            })
            .map(article => ({
                headline: article.title,
                section: article.section,
                publishedAt: article.publishedAt,
                slug: article.id, // id is the slug
            }))
            .slice(0, 10); // Limit to top 10 results

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ results: [], error: 'Failed to search articles' }, { status: 500 });
    }
}
