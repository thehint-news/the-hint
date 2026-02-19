/**
 * Delete Article API Route
 * DELETE /api/publish/delete
 * 
 * Handles deletion of both drafts and published articles.
 * All deletions are backed by Git commits.
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
 * DELETE - Remove an article (draft or published)
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

        // Handle draft deletion
        if (type === 'draft' || (typeof id === 'string' && id.startsWith('draft-'))) {
            const draftId = id;

            // Check if draft exists
            if (!await contentGit.draftExists(draftId)) {
                return userResponse(
                    false,
                    'Draft not found. It may have already been deleted.',
                    404
                );
            }

            const result = await contentGit.deleteDraft(draftId);

            if (!result.success) {
                logger.error('Draft deletion failed', result.error);
                return userResponse(
                    false,
                    result.userMessage || 'Couldn\'t delete this draft. Please try again.',
                    500
                );
            }

            return userResponse(true, 'Draft deleted.');
        }

        // Handle published article deletion
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

            // Check if article exists
            if (!await contentGit.slugExists(section as Section, safeSlug)) {
                return userResponse(
                    false,
                    'Article not found. It may have already been deleted.',
                    404
                );
            }

            const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);

            if (!result.success) {
                logger.error('Published article deletion failed', result.error);
                return userResponse(
                    false,
                    result.userMessage || 'Couldn\'t delete this article. Please try again.',
                    500
                );
            }

            return userResponse(true, 'Article removed.');
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
