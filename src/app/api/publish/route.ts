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

import { NextRequest, NextResponse, after } from 'next/server';
import {
    validateArticleInput,
    transformToValidatedData,
    PublishArticleInput,
    generateSlug,
    generateUniqueSlugSuffix,
} from '@/lib/validation';
import { contentGit, DraftData, PublishedArticleData } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/session';
import { translateArticle } from '@/lib/i18n/translation-service';
import { clearArticleCache } from '@/lib/cache/article-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Valid sections */
type Section = 'politics' | 'world-affairs' | 'crime' | 'court' | 'opinion' | 'local';

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

        // Fetch English translation for slug generation if slug is not explicitly provided
        if (typeof input.slug !== 'string' || !input.slug.trim()) {
            try {
                const { translateTextToEnglish } = await import('@/lib/i18n/translation-service');
                const englishHeadline = await translateTextToEnglish(input.headline as string);
                if (englishHeadline) {
                    // Update input with the English slug before validation transforms it
                    input.slug = generateSlug(englishHeadline);
                    logger.info(`[PUBLISH] Generated English slug from translation: ${input.slug}`);
                }
            } catch {
                logger.warn('[PUBLISH] Failed to generate English slug via translation API, falling back to local generation');
            }
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
        let targetSlug = articleData.slug;
        const inputSlug = typeof input.slug === 'string' && input.slug ? input.slug : null;
        const isSelfUpdate = inputSlug && inputSlug === targetSlug;

        // If slug exists and this is not a self-update, generate a unique suffix
        if (!isSelfUpdate && await contentGit.slugExists(articleData.section as Section, targetSlug)) {
            // Generate unique suffix using headline + timestamp for hash
            const hashInput = `${articleData.headline}-${Date.now()}`;
            targetSlug = generateUniqueSlugSuffix(targetSlug, hashInput);

            // Update articleData with new unique slug
            articleData.slug = targetSlug;

            logger.info(`[PUBLISH] Generated unique slug with suffix: ${targetSlug}`);
        }

        // Get draft ID if provided
        const draftId = (body as Record<string, unknown>).draftId;
        const draftIdString = typeof draftId === 'string' ? draftId : undefined;

        // LEAD STORY ENFORCEMENT
        // If this article is marked as lead, attempt to enforce single-lead constraint
        // This runs in the background and doesn't block publishing if it fails
        if (articleData.isLead) {
            try {
                const { findCurrentLead, atomicallySwapLead } = await import('@/lib/lead/enforcement');
                const currentLead = await findCurrentLead();

                // Only swap if this is a different article
                if (!currentLead || currentLead.slug !== targetSlug || currentLead.section !== articleData.section) {
                    await atomicallySwapLead(
                        articleData.section as Section,
                        targetSlug,
                        articleData.headline,
                        currentLead
                    );
                }
            } catch {
                // Don't fail the publish if lead enforcement errors
                // The article will still be published with isLead=true
            }
        }

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
            isLead: articleData.isLead,
            leadMedia: articleData.leadMedia,
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

        // Generate English translation in background
        // This runs async without blocking the publish response.
        // Includes pipeline-level retry: if first attempt fails, waits and retries once.
        after(async () => {
            const PIPELINE_MAX_ATTEMPTS = 2;
            const PIPELINE_RETRY_DELAY_MS = 5_000; // 5 seconds between pipeline attempts

            // Allow the publish Git commit to settle on disk before we read-modify-write
            await new Promise(r => setTimeout(r, 2_000));

            for (let pipelineAttempt = 1; pipelineAttempt <= PIPELINE_MAX_ATTEMPTS; pipelineAttempt++) {
                try {
                    logger.info(`[PUBLISH] Translation pipeline attempt ${pipelineAttempt}/${PIPELINE_MAX_ATTEMPTS} for ${targetSlug}`);

                    // Prepare article for translation
                    const articleForTranslation = {
                        title: articleData.headline,
                        subheadline: articleData.subheadline,
                        body: articleData.body || '',
                        excerpt: articleData.subheadline,
                    };

                    // Generate translation (translateArticle already has per-API-call retries)
                    const translation = await translateArticle(articleForTranslation);

                    if (translation) {
                        // Update the article file with translation
                        const { contentGit } = await import('@/lib/git');
                        const updateResult = await contentGit.updateTranslation(
                            articleData.section as Section,
                            targetSlug,
                            {
                                title: translation.title,
                                subheadline: translation.subheadline,
                                body: translation.body,
                                excerpt: translation.excerpt,
                                translatedAt: translation.translatedAt,
                            }
                        );

                        if (updateResult.success) {
                            logger.info(`[PUBLISH] ✅ Translation saved for ${targetSlug} (attempt ${pipelineAttempt})`);
                            clearArticleCache();
                            revalidatePath('/', 'page');
                            revalidatePath('/en', 'page');
                            revalidatePath(`/${articleData.section}`, 'page');
                            revalidatePath(`/en/${articleData.section}`, 'page');
                            revalidatePath(`/${articleData.section}/${targetSlug}`, 'page');
                            revalidatePath(`/en/${articleData.section}/${targetSlug}`, 'page');
                            return; // ← SUCCESS – exit the retry loop
                        } else {
                            logger.error(`[PUBLISH] Git save failed for translation of ${targetSlug}`, { error: updateResult.error });
                            // Fall through to retry
                        }
                    } else {
                        logger.warn(`[PUBLISH] translateArticle returned null for ${targetSlug}`);
                        // Fall through to retry
                    }
                } catch (translationError) {
                    logger.error(`[PUBLISH] Translation pipeline attempt ${pipelineAttempt} threw:`, translationError);
                }

                // If not the last attempt, wait before retrying the entire pipeline
                if (pipelineAttempt < PIPELINE_MAX_ATTEMPTS) {
                    logger.info(`[PUBLISH] Waiting ${PIPELINE_RETRY_DELAY_MS}ms before translation retry...`);
                    await new Promise(r => setTimeout(r, PIPELINE_RETRY_DELAY_MS));
                }
            }

            // All pipeline attempts exhausted – mark as failed
            logger.error(`[PUBLISH] ❌ All translation pipeline attempts failed for ${targetSlug}. Marking as failed.`);
            try {
                const { contentGit: git } = await import('@/lib/git');
                await git.markTranslationFailed(articleData.section as Section, targetSlug);
            } catch (e) {
                logger.error('[PUBLISH] Emergency: Could not mark translation as failed', e);
            }
        });

        // Send article notification emails to subscribers.
        // We use Next.js `after()` to run this securely in the background
        // without blocking the user's publish response.
        after(async () => {
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

                // Process the queue in batches until complete
                const { processSubscriptionQueue } = await import('@/lib/subscription/processor');
                let remaining = true;
                while (remaining) {
                    const queueResult = await processSubscriptionQueue();
                    logger.info(`[PUBLISH] Batch processor: ${queueResult.processed} emails sent, ${queueResult.errors} errors`);
                    remaining = queueResult.remaining;
                    // Prevent tight loop
                    if (remaining) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } catch (queueError) {
                logger.error('[PUBLISH] Queue processing failed in background:', queueError);
            }
        });

        // CACHE INVALIDATION: Clear article cache immediately after successful publish
        clearArticleCache();

        // 7. On-demand revalidation
        revalidatePath('/', 'page');
        revalidatePath('/en', 'page');
        revalidatePath(`/${articleData.section}`, 'page');
        revalidatePath(`/en/${articleData.section}`, 'page');
        revalidatePath(`/${articleData.section}/${targetSlug}`, 'page');
        revalidatePath(`/en/${articleData.section}/${targetSlug}`, 'page');

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
