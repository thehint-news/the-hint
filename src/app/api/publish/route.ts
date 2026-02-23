/**
 * Publish API Route
 * POST /api/publish - Publish an article
 * GET /api/publish - Get all articles (drafts + published)
 * 
 * All operations are backed by Git commits.
 * Git is the single source of truth.
 * 
 * RULES:
 * - Publishing is atomic and irreversible
 * - All validation happens server-side
 * - Drafts and published articles are strictly separated
 * - No silent failures
 * - Publishing commits: "Publish: {{headline}}"
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    validateArticleInput,
    transformToValidatedData,
    PublishArticleInput,
    generateSlug,
} from '@/lib/validation';
import { contentGit, DraftData, PublishedArticleData } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/session';

/** Valid sections */
type Section = 'politics' | 'world-affairs' | 'crime' | 'court' | 'opinion';

/**
 * User-friendly response helper
 */
function userResponse(
    success: boolean,
    message: string,
    data?: Record<string, unknown>,
    status: number = success ? 200 : 400
) {
    return NextResponse.json(
        {
            success,
            message,
            error: success ? undefined : message,
            ...(data && { data }),
        },
        { status }
    );
}

const AUTH_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

/**
 * Helper to enforce authentication
 * Returns null if authenticated, or a userResponse if failed
 */
async function requireAuth() {
    try {
        await verifyAuth();
        return null;
    } catch {
        return userResponse(false, AUTH_EXPIRED_MESSAGE, undefined, 401);
    }
}

/**
 * POST - Publish an article
 * This is the FINAL, atomic publish action.
 * Steps:
 * 1. Validate content server-side
 * 2. Generate final slug
 * 3. Write markdown to /content/{section}/{slug}.md
 * 4. Delete corresponding draft file (if exists)
 * 5. Commit atomically: "Publish: {{headline}}"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce strict session
        const authResponse = await requireAuth();
        if (authResponse) return authResponse;

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return userResponse(
                false,
                'Invalid request format.',
                { errors: [{ field: 'body', message: 'Request body must be valid JSON' }] },
                400
            );
        }

        // Ensure body is an object
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return userResponse(
                false,
                'Invalid request format.',
                { errors: [{ field: 'body', message: 'Request body must be a JSON object' }] },
                400
            );
        }

        const input = body as PublishArticleInput;

        // Verify this is a publish request
        if (input.status !== 'published') {
            return userResponse(
                false,
                'This endpoint is for publishing only. Use /api/publish/draft to save drafts.',
                { errors: [{ field: 'status', message: 'Status must be "published"' }] },
                400
            );
        }

        // Validate all inputs with FULL validation
        const validationResult = validateArticleInput(input);

        if (!validationResult.isValid) {
            return userResponse(
                false,
                'Please complete all required fields before publishing.',
                { errors: validationResult.errors },
                400
            );
        }

        // Transform to validated data
        const articleData = transformToValidatedData(input);

        // Validate slug is not empty after transformation
        if (!articleData.slug) {
            return userResponse(
                false,
                'Could not generate a valid URL from the headline.',
                { errors: [{ field: 'headline', message: 'Headline must contain at least one alphanumeric character' }] },
                400
            );
        }

        // Check if slug already exists (allow updates)
        const targetSlug = articleData.slug;
        const inputSlug = typeof input.slug === 'string' && input.slug ? input.slug : null;
        const isSelfUpdate = inputSlug && inputSlug === targetSlug;

        if (!isSelfUpdate && await contentGit.slugExists(articleData.section as Section, targetSlug)) {
            return userResponse(
                false,
                `An article with this title already exists in ${articleData.section}.`,
                {
                    errors: [{
                        field: 'headline',
                        message: `An article with this title already exists in the ${articleData.section} section`
                    }]
                },
                409
            );
        }

        // Get draft ID if provided
        const draftId = (body as Record<string, unknown>).draftId;
        const draftIdString = typeof draftId === 'string' ? draftId : undefined;

        // Perform atomic publish operation
        const result = await contentGit.publish({
            headline: articleData.headline,
            subheadline: articleData.subheadline,
            section: articleData.section as Section,
            contentType: articleData.contentType,
            body: articleData.body,
            bodyBlocks: articleData.bodyBlocks,
            tags: articleData.tags,
            sources: articleData.sources,
            placement: articleData.placement,
            thumbnail: articleData.thumbnail,
            slug: targetSlug,
            draftId: draftIdString,
        });

        if (!result.success) {
            logger.error('Publish failed', result.error);
            return userResponse(
                false,
                result.userMessage || 'Publishing didn\'t complete. Please try again.',
                undefined,
                500
            );
        }

        // Send article notification emails to subscribers.
        // IMPORTANT: On Vercel serverless, background work is killed after response.
        // We MUST await email sending before returning the response.
        try {
            const { queueManager } = await import('@/lib/subscription/queue');
            await queueManager.enqueue({
                articleSlug: targetSlug,
                section: articleData.section,
                headline: articleData.headline,
                summary: articleData.subheadline || 'Read the full story on our website.',
                contentType: (articleData.contentType as 'news' | 'opinion') || 'news',
                priority: 'normal',
            });
            logger.info(`[PUBLISH] Subscription event enqueued for ${targetSlug}`);

            // Process the queue synchronously — Vercel kills background work
            const { processSubscriptionQueue } = await import('@/lib/subscription/processor');
            const queueResult = await processSubscriptionQueue();
            logger.info(`[PUBLISH] Queue processor: ${queueResult.processed} emails sent, ${queueResult.errors} errors`);

        } catch (queueError) {
            logger.error('[PUBLISH] Queue-based email delivery failed, trying direct send:', queueError);

            // Fallback: Send emails directly via Resend (bypassing queue)
            try {
                const { sendArticleEmail } = await import('@/lib/welcomeEmail');
                await sendArticleEmail({
                    headline: articleData.headline,
                    summary: articleData.subheadline || 'Read the full story on our website.',
                    section: articleData.section,
                    publishedAt: new Date().toISOString(),
                    url: `/${articleData.section}/${targetSlug}`,
                });
                logger.info('[PUBLISH] Direct email fallback succeeded.');
            } catch (directError) {
                logger.error('[PUBLISH] Direct email fallback also failed:', directError);
            }
            // Critical: Do NOT fail publishing. Valid content > Email delivery.
        }

        // 7. On-demand revalidation
        revalidatePath('/', 'page');
        revalidatePath(`/${articleData.section}`, 'page');
        revalidatePath(`/${articleData.section}/${targetSlug}`, 'page');

        return userResponse(
            true,
            result.userMessage || 'Article published successfully.',
            {
                slug: result.data?.slug,
                section: result.data?.section,
                url: result.data?.url,
                publishedAt: result.data?.publishedAt,
                mode: result.data?.mode,
            },
            result.data?.mode === 'create' ? 201 : 200
        );

    } catch (error) {
        logger.error('Unexpected error in publish API', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
            undefined,
            500
        );
    }
}

/**
 * GET - Get all articles (drafts and published)
 * Returns a combined list for the editorial dashboard
 */
export async function GET(): Promise<NextResponse> {
    try {
        // Enforce strict session
        const authResponse = await requireAuth();
        if (authResponse) return authResponse;

        // Get all drafts
        const draftsResult = await contentGit.listDrafts();
        const drafts = draftsResult.success ? draftsResult.data || [] : [];

        // Get all published articles
        const publishedResult = await contentGit.listPublishedArticles();
        const published = publishedResult.success ? publishedResult.data || [] : [];

        // Transform to unified list format
        const articles = [
            ...drafts.map((d: DraftData) => ({
                id: d.draftId,
                type: 'draft' as const,
                headline: d.headline,
                subheadline: d.subheadline,
                section: d.section,
                contentType: d.contentType,
                body: d.body,
                bodyBlocks: d.bodyBlocks,
                tags: d.tags,
                sources: d.sources,
                placement: d.placement,
                thumbnail: d.thumbnail,
                savedAt: d.savedAt,
                publishedAt: undefined as undefined,
                slug: d.slug || generateSlug(d.headline),
            })),
            ...published.map((p: PublishedArticleData) => ({
                id: `published-${p.section}-${p.slug}`,
                type: 'published' as const,
                headline: p.title,
                subheadline: p.subtitle,
                section: p.section,
                contentType: p.contentType,
                body: p.body,
                bodyBlocks: p.bodyBlocks,
                tags: p.tags,
                sources: p.sources,
                placement: p.placement,
                thumbnail: p.image,
                savedAt: undefined as undefined,
                publishedAt: p.publishedAt,
                slug: p.slug,
            })),
        ];

        // Sort by most recent activity
        articles.sort((a, b) => {
            const dateA = new Date(a.savedAt || a.publishedAt || 0);
            const dateB = new Date(b.savedAt || b.publishedAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return userResponse(
            true,
            `Found ${drafts.length} draft(s) and ${published.length} published article(s).`,
            {
                articles,
                drafts: drafts.length,
                published: published.length,
            }
        );

    } catch (error) {
        logger.error('Unexpected error in articles list API', error);
        return userResponse(
            false,
            'Couldn\'t load articles right now.',
            undefined,
            500
        );
    }
}

/**
 * Reject unsupported HTTP methods
 */
export async function PUT(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', undefined, 405);
}

export async function DELETE(): Promise<NextResponse> {
    return userResponse(false, 'Use /api/publish/delete for deletion.', undefined, 405);
}

export async function PATCH(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', undefined, 405);
}
