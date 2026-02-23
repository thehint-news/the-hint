/**
 * Delete Article API Route
 * DELETE /api/publish/delete
 * 
 * Handles deletion of both drafts and published articles.
 * All deletions are backed by Git commits.
 * 
 * ARCHITECTURE:
 * - Idempotent: calling delete on an already-deleted article returns success (not 404)
 * - Revalidating: triggers ISR cache bust for homepage + section pages
 * - No 404s on repeat calls — safe to retry
 * - Git push is already async inside ContentGit (pushAsync)
 * 
 * RULES:
 * - No hard deletes without commit
 * - History must remain recoverable
 * - Commits: "Remove draft: {{headline}}" or "Remove article: {{headline}}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { contentGit } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { verifyAuth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

/** Valid sections */
type Section = 'politics' | 'world-affairs' | 'crime' | 'court' | 'opinion';
const VALID_SECTIONS: Section[] = ['politics', 'crime', 'court', 'opinion', 'world-affairs'];

/**
 * Per-article lock to prevent concurrent deletes on the same article.
 * Cleared after each request completes.
 */
const inFlightDeletes = new Set<string>();

/**
 * User-friendly response helper
 */
function userResponse(
    success: boolean,
    message: string,
    status: number = success ? 200 : 400
) {
    return NextResponse.json(
        {
            success,
            message,
            error: success ? undefined : message,
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
        return userResponse(false, AUTH_EXPIRED_MESSAGE, 401);
    }
}

/**
 * Revalidate all pages that could display an article from a given section.
 * Fire-and-forget — errors are logged but never block the response.
 */
function revalidateArticlePages(section?: string): void {
    try {
        revalidatePath('/', 'page');
        if (section && VALID_SECTIONS.includes(section as Section)) {
            revalidatePath(`/${section}`, 'page');
        }
    } catch (error) {
        logger.error('Revalidation failed (non-blocking)', error);
    }
}

/**
 * DELETE - Remove an article (draft or published)
 * 
 * IDEMPOTENT: If the article is already gone, returns success.
 * ATOMIC: Only one delete per article ID can be in-flight at a time.
 * 
 * Request body:
 * {
 *   id: string,                    // Required: article identifier
 *   type: 'draft' | 'published',   // Required: article type
 *   section?: string,              // Required for published articles
 *   slug?: string                  // Required for published articles
 * }
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce strict session
        const authResponse = await requireAuth();
        if (authResponse) return authResponse;

        let body: Record<string, unknown>;

        try {
            body = await request.json();
        } catch {
            return userResponse(
                false,
                'Invalid request format.',
                400
            );
        }

        const { id, type, section, slug } = body;

        if (!id || typeof id !== 'string') {
            return userResponse(
                false,
                'Please specify an article to delete.',
                400
            );
        }

        // --- DRAFT DELETION ---
        if (type === 'draft' || (typeof id === 'string' && id.startsWith('draft-'))) {
            const draftId = id;
            const lockKey = `draft:${draftId}`;

            // Prevent concurrent deletes on the same draft
            if (inFlightDeletes.has(lockKey)) {
                return userResponse(true, 'Draft already being removed.');
            }

            // Idempotent: if draft doesn't exist, it's already gone — success
            if (!await contentGit.draftExists(draftId)) {
                return userResponse(true, 'Draft removed.');
            }

            // Lock
            inFlightDeletes.add(lockKey);

            try {
                const result = await contentGit.deleteDraft(draftId);

                if (!result.success) {
                    logger.error('Draft deletion failed', result.error);
                    return userResponse(
                        false,
                        result.userMessage || "Couldn't delete this draft. Please try again.",
                        500
                    );
                }

                return userResponse(true, 'Draft removed.');
            } finally {
                inFlightDeletes.delete(lockKey);
            }
        }

        // --- PUBLISHED ARTICLE DELETION ---
        if (type === 'published' || (typeof id === 'string' && id.startsWith('published-'))) {
            if (!section || typeof section !== 'string' || !VALID_SECTIONS.includes(section as Section)) {
                return userResponse(
                    false,
                    'Invalid section specified.',
                    400
                );
            }

            if (!slug || typeof slug !== 'string') {
                return userResponse(
                    false,
                    'Article identifier is missing.',
                    400
                );
            }

            // Sanitize slug
            const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-');
            const lockKey = `published:${section}:${safeSlug}`;

            // Prevent concurrent deletes on the same article
            if (inFlightDeletes.has(lockKey)) {
                return userResponse(true, 'Article already being removed.');
            }

            // Idempotent: if article doesn't exist, it's already gone — success
            if (!await contentGit.slugExists(section as Section, safeSlug)) {
                // Even though already gone, revalidate to ensure caches are clean
                revalidateArticlePages(section as string);
                return userResponse(true, 'Article removed.');
            }

            // Lock
            inFlightDeletes.add(lockKey);

            try {
                const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);

                if (!result.success) {
                    logger.error('Published article deletion failed', result.error);
                    return userResponse(
                        false,
                        result.userMessage || "Couldn't delete this article. Please try again.",
                        500
                    );
                }

                // Revalidate ISR caches after successful deletion
                revalidateArticlePages(section as string);

                return userResponse(true, 'Article permanently removed.');
            } finally {
                inFlightDeletes.delete(lockKey);
            }
        }

        return userResponse(
            false,
            'Please specify the article type (draft or published).',
            400
        );

    } catch (error) {
        logger.error('Error deleting article', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
            500
        );
    }
}

/**
 * Reject unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', 405);
}

export async function POST(): Promise<NextResponse> {
    return userResponse(false, 'Use DELETE method to remove articles.', 405);
}

export async function PUT(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', 405);
}

export async function PATCH(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', 405);
}
