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
    generateUniqueSlugSuffix,
} from '@/lib/validation';
import { contentGit, DraftData, PublishedArticleData } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/session';
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
    status: number = success ? 200 : 400,
    errorType: string = 'unknown_error'
) {
    const payload: Record<string, unknown> = {
        success,
        message,
    };
    if (!success) {
        payload.type = errorType;
        payload.error = message;
    }
    if (data) {
        Object.assign(payload, data);
    }
    return NextResponse.json(payload, { status });
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
                400,
                'validation_error'
            );
        }

        // Ensure body is an object
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return userResponse(
                false,
                'Invalid request format.',
                { errors: [{ field: 'body', message: 'Request body must be a JSON object' }] },
                400,
                'validation_error'
            );
        }

        const input = body as PublishArticleInput;

        // Verify this is a publish request
        if (input.status !== 'published') {
            return userResponse(
                false,
                'This endpoint is for publishing only. Use /api/publish/draft to save drafts.',
                { errors: [{ field: 'status', message: 'Status must be "published"' }] },
                400,
                'validation_error'
            );
        }

        // Validate all inputs with FULL validation
        const validationResult = validateArticleInput(input);

        if (!validationResult.isValid) {
            return userResponse(
                false,
                'Please complete all required fields before publishing.',
                { errors: validationResult.errors },
                400,
                'validation_error'
            );
        }

        // Generate slug from headline if not explicitly provided
        if (typeof input.slug !== 'string' || !input.slug.trim()) {
            input.slug = generateSlug(input.headline as string);
            logger.info(`[PUBLISH] Generated slug from headline: ${input.slug}`);
        }

        // Transform to validated data
        const articleData = transformToValidatedData(input);

        // Validate slug is not empty after transformation
        if (!articleData.slug) {
            return userResponse(
                false,
                'Could not generate a valid URL from the headline.',
                { errors: [{ field: 'headline', message: 'Headline must contain at least one alphanumeric character' }] },
                400,
                'validation_error'
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
            
            const isGitError = result.error && typeof (result.error as { toJSON?: () => unknown }).toJSON === 'function';
            if (isGitError) {
                const gitErrObj = (result.error as { toJSON: () => { errorType: string; [key: string]: unknown } }).toJSON();
                const statusCode = gitErrObj.errorType === 'CONFLICT' ? 409 : 500;
                return NextResponse.json(gitErrObj, { status: statusCode });
            }

            return userResponse(
                false,
                result.userMessage || 'Publishing didn\'t complete. Please try again.',
                undefined,
                500,
                'system_error'
            );
        }


        // CACHE INVALIDATION: Clear article cache immediately after successful publish
        clearArticleCache();

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
                500,
                'system_error'
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
