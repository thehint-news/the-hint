/**
 * Translation Retry API Route
 * POST /api/publish/retry-translation
 * 
 * Retries translation for an article that has status 'failed' or 'pending'.
 * This is a self-healing endpoint: it can be called manually from the admin
 * dashboard, or automatically on a schedule to fix any articles stuck in
 * a failed/pending translation state.
 * 
 * Body: { section: string, slug: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { translateArticle } from '@/lib/i18n/translation-service';
import { contentGit } from '@/lib/git';
import { clearArticleCache } from '@/lib/cache/article-cache';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/feedback/console-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Section = 'politics' | 'world-affairs' | 'crime' | 'court' | 'opinion' | 'local';

const VALID_SECTIONS: string[] = ['politics', 'world-affairs', 'crime', 'court', 'opinion', 'local'];

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Auth check
        try {
            await verifyAuth();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse body
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { section, slug } = body as { section?: string; slug?: string };

        if (!section || !slug) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: section, slug' },
                { status: 400 }
            );
        }

        if (!VALID_SECTIONS.includes(section)) {
            return NextResponse.json(
                { success: false, error: `Invalid section: ${section}` },
                { status: 400 }
            );
        }

        // Load the article
        const loadResult = await contentGit.loadPublishedArticle(section as Section, slug);
        if (!loadResult.success || !loadResult.data) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        const article = loadResult.data;

        // Check current translation status
        const currentStatus = article.translations?.en?.status;
        if (currentStatus === 'ready') {
            return NextResponse.json({
                success: true,
                message: 'Translation already exists and is ready',
                status: 'ready',
            });
        }

        logger.info(`[RETRY-TRANSLATION] Starting retry for ${section}/${slug} (current status: ${currentStatus || 'none'})`);

        // Perform translation synchronously (this is an explicit user action, not background)
        const translation = await translateArticle({
            title: article.title,
            subheadline: article.subtitle,
            body: article.body || '',
            excerpt: article.subtitle,
            tags: article.tags,
            sources: article.sources,
        });

        if (!translation) {
            logger.error(`[RETRY-TRANSLATION] Translation generation failed for ${section}/${slug}`);
            return NextResponse.json(
                { success: false, error: 'Translation API returned no result after retries' },
                { status: 502 }
            );
        }

        // Save translation
        const updateResult = await contentGit.updateTranslation(
            section as Section,
            slug,
            {
                title: translation.title,
                subheadline: translation.subheadline,
                body: translation.body,
                excerpt: translation.excerpt,
                tags: translation.tags,
                sources: translation.sources,
                translatedAt: translation.translatedAt,
            }
        );

        if (!updateResult.success) {
            logger.error(`[RETRY-TRANSLATION] Failed to save translation for ${section}/${slug}`, {
                error: updateResult.error,
            });
            return NextResponse.json(
                { success: false, error: 'Translation generated but failed to save to Git' },
                { status: 500 }
            );
        }

        // Invalidate caches
        clearArticleCache();
        revalidatePath('/', 'page');
        revalidatePath('/en', 'page');
        revalidatePath(`/${section}`, 'page');
        revalidatePath(`/en/${section}`, 'page');
        revalidatePath(`/${section}/${slug}`, 'page');
        revalidatePath(`/en/${section}/${slug}`, 'page');

        logger.info(`[RETRY-TRANSLATION] ✅ Translation successfully retried for ${section}/${slug}`);

        return NextResponse.json({
            success: true,
            message: 'Translation generated and saved successfully',
            data: {
                title: translation.title,
                translatedAt: translation.translatedAt,
            },
        });
    } catch (error) {
        logger.error('[RETRY-TRANSLATION] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
