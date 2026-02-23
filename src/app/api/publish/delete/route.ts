/**
 * Delete Article API Route
 * DELETE /api/publish/delete
 * 
 * Handles deletion of both drafts and published articles.
 * All deletions are backed by Git commits.
 * 
 * ARCHITECTURE:
 * - Idempotent: deleting an already-deleted article returns success
 * - Revalidating: triggers ISR cache bust for homepage + section pages
 * - Delegates to ContentGit which handles all Git operations
 * - No redundant existence checks — ContentGit handles 404s gracefully
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
 * Revalidate all pages that could display an article from a given section.
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
 * FAST: No redundant existence checks — ContentGit handles idempotency.
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
        // 1. Auth check
        try {
            await verifyAuth();
        } catch {
            return userResponse(false, AUTH_EXPIRED_MESSAGE, 401);
        }

        // 2. Parse body
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return userResponse(false, 'Invalid request format.', 400);
        }

        const { id, type, section, slug } = body;

        if (!id || typeof id !== 'string') {
            return userResponse(false, 'Please specify an article to delete.', 400);
        }

        // --- DRAFT DELETION ---
        if (type === 'draft' || (typeof id === 'string' && id.startsWith('draft-'))) {
            logger.info(`[DELETE] Deleting draft: ${id}`);

            const result = await contentGit.deleteDraft(id as string);

            if (!result.success) {
                logger.error('[DELETE] Draft deletion failed:', result.userMessage);
                return userResponse(false, result.userMessage || "Couldn't delete this draft. Please try again.", 500);
            }

            logger.info(`[DELETE] Draft deleted successfully: ${id}`);
            return userResponse(true, 'Draft removed.');
        }

        // --- PUBLISHED ARTICLE DELETION ---
        if (type === 'published' || (typeof id === 'string' && id.startsWith('published-'))) {
            if (!section || typeof section !== 'string' || !VALID_SECTIONS.includes(section as Section)) {
                return userResponse(false, 'Invalid section specified.', 400);
            }

            if (!slug || typeof slug !== 'string') {
                return userResponse(false, 'Article identifier is missing.', 400);
            }

            const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-');

            logger.info(`[DELETE] Deleting published article: ${section}/${safeSlug}`);

            const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);

            if (!result.success) {
                logger.error('[DELETE] Published article deletion failed:', result.userMessage);
                return userResponse(false, result.userMessage || "Couldn't delete this article. Please try again.", 500);
            }

            // Revalidate ISR caches after successful deletion
            revalidateArticlePages(section as string);

            logger.info(`[DELETE] Published article deleted successfully: ${section}/${safeSlug}`);
            return userResponse(true, 'Article permanently removed.');
        }

        return userResponse(false, 'Please specify the article type (draft or published).', 400);

    } catch (error) {
        logger.error('[DELETE] Unexpected error:', error);
        return userResponse(false, 'Something went wrong. Please try again.', 500);
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
