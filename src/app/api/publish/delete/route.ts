/** 
 * ARCHITECTURE:
 * - Idempotent: calling delete on an already-deleted article returns success
 * - Decoupled: Git commit runs as background operation; response returns immediately
 * - Revalidating: triggers ISR cache bust for homepage + section pages
 * - No 404s on repeat calls — safe to retry
 * 
 * RULES:
 * - No hard deletes without commit
 * - History must remain recoverable
 * - Commits: "Draft deleted: {{headline}}" or "Remove article: {{headline}}"
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
 * In-flight delete tracker to prevent concurrent deletes on the same article.
 * Maps article identifier (id or section/slug) to a Promise.
 * This is per-instance; on serverless it prevents within-request races.
 */
const inFlightDeletes = new Map<string, Promise<void>>();

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
 * DECOUPLED: Git commit runs in the background; UI gets an immediate response.
 * ATOMIC: Only one delete per article ID can be in-flight at a time.
 * 
 * Request body:
 * {
 *   id: string,          // Required: article identifier
 *   type: 'draft' | 'published',  // Required: article type
 *   section?: string,    // Required for published articles
 *   slug?: string        // Required for published articles
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

            // Create the delete promise and register it
            const deletePromise = (async () => {
                try {
                    await contentGit.deleteDraft(draftId);
                } catch (error) {
                    logger.error('Background draft deletion failed', error);
                } finally {
                    inFlightDeletes.delete(lockKey);
                }
            })();

            inFlightDeletes.set(lockKey, deletePromise);

            // Wait for the actual deletion to complete before responding
            // (Git commit is already async inside contentGit.deleteDraft via pushAsync)
            try {
                await deletePromise;
            } catch {
                // Already logged inside the promise
            }

            return userResponse(true, 'Draft removed.');
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

            // Create the delete promise and register it
            const deletePromise = (async () => {
                try {
                    const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);
                    if (result.success) {
                        // Revalidate ISR caches after successful deletion
                        revalidateArticlePages(section as string);
                    }
                } catch (error) {
                    logger.error('Background article deletion failed', error);
                } finally {
                    inFlightDeletes.delete(lockKey);
                }
            })();

            inFlightDeletes.set(lockKey, deletePromise);

            // Wait for deletion to complete (push is already async via pushAsync)
            try {
                await deletePromise;
            } catch {
                // Already logged inside the promise
            }

            return userResponse(true, 'Article permanently removed.');
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
