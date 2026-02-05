/**
 * Articles API Route
 * GET /api/publish/articles
 * 
 * Returns a combined list of drafts and published articles for the editorial database.
 * Now backed by Git for version control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { contentGit, DraftData, PublishedArticleData } from '@/lib/git';

interface ArticleEntry {
    id: string;
    title: string;
    section: string;
    status: 'draft' | 'published';
    placement: 'lead' | 'top' | 'standard';
    lastEdited: string;
    publishedAt?: string;
    slug?: string;
    data: {
        headline: string;
        subheadline: string;
        section: string;
        contentType: string;
        body: string;
        tags: string;
        placement: 'lead' | 'top' | 'standard';
        sources: string;
        draftId: string | null;
        status: 'draft' | 'published';
        slug?: string;
        publishedAt?: string;
        lastEdited?: string;
    };
}

/**
 * Transform draft data to article entry
 */
function transformDraftToEntry(draft: DraftData): ArticleEntry {
    return {
        id: draft.draftId,
        title: draft.headline || 'Untitled',
        section: draft.section,
        status: 'draft',
        placement: (draft.placement as 'lead' | 'top' | 'standard') || 'standard',
        lastEdited: draft.savedAt,
        data: {
            headline: draft.headline,
            subheadline: draft.subheadline,
            section: draft.section,
            contentType: draft.contentType,
            body: draft.body,
            tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : '',
            placement: (draft.placement as 'lead' | 'top' | 'standard') || 'standard',
            sources: Array.isArray(draft.sources) ? draft.sources.join(', ') : '',
            draftId: draft.draftId,
            status: 'draft',
            lastEdited: draft.savedAt,
        },
    };
}

/**
 * Transform published article data to article entry
 */
function transformPublishedToEntry(article: PublishedArticleData): ArticleEntry {
    return {
        id: `published-${article.section}-${article.slug}`,
        title: article.title,
        section: article.section,
        status: 'published',
        placement: (article.placement as 'lead' | 'top' | 'standard') || 'standard',
        lastEdited: article.updatedAt || article.publishedAt,
        publishedAt: article.publishedAt,
        slug: article.slug,
        data: {
            headline: article.title,
            subheadline: article.subtitle,
            section: article.section,
            contentType: article.contentType,
            body: article.body,
            tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
            placement: (article.placement as 'lead' | 'top' | 'standard') || 'standard',
            sources: Array.isArray(article.sources) ? article.sources.join(', ') : '',
            draftId: null,
            status: 'published',
            slug: article.slug,
            publishedAt: article.publishedAt,
            lastEdited: article.updatedAt || article.publishedAt,
        },
    };
}

/**
 * GET - List all articles (drafts + published)
 * Uses Git-backed content operations
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter'); // 'drafts', 'published', or 'all'

        let articles: ArticleEntry[] = [];

        if (filter === 'drafts') {
            // Get drafts only
            const result = await contentGit.listDrafts();
            if (result.success && result.data) {
                articles = result.data.map(transformDraftToEntry);
            }
        } else if (filter === 'published') {
            // Get published only
            const result = await contentGit.listPublishedArticles();
            if (result.success && result.data) {
                articles = result.data.map(transformPublishedToEntry);
            }
        } else {
            // All articles
            const [draftsResult, publishedResult] = await Promise.all([
                contentGit.listDrafts(),
                contentGit.listPublishedArticles(),
            ]);

            const drafts = draftsResult.success && draftsResult.data
                ? draftsResult.data.map(transformDraftToEntry)
                : [];
            const published = publishedResult.success && publishedResult.data
                ? publishedResult.data.map(transformPublishedToEntry)
                : [];

            articles = [...drafts, ...published];
        }

        // Sort by lastEdited (newest first)
        articles.sort((a, b) => {
            const dateA = new Date(a.lastEdited).getTime();
            const dateB = new Date(b.lastEdited).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            data: {
                articles,
                count: articles.length,
            },
        });
    } catch (error) {
        console.error('Error listing articles:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Couldn\'t load articles right now.',
            },
            { status: 500 }
        );
    }
}
