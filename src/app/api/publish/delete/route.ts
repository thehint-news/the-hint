import { NextRequest, NextResponse } from 'next/server';
import { contentGit } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { verifyAuth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

/** Valid sections */
type Section = 'politics' | 'world-affairs' | 'crime' | 'court' | 'opinion' | 'local';
const VALID_SECTIONS: Section[] = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

const AUTH_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

/**
 * DELETE - Remove an article (draft or published)
 * 
 * IDEMPOTENT: If the article is already gone, returns success.
 * FAST: No redundant existence checks — ContentGit handles idempotency.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    logger.info('[DELETE] Delete request received');

    try {
        // PART 8 - PRODUCTION ENVIRONMENT VALIDATION
        if (!process.env.GIT_TOKEN || !process.env.GIT_REPO_OWNER || !process.env.GIT_REPO_NAME) {
            logger.error('[DELETE] Missing critical Git environment variables (GIT_TOKEN, GIT_REPO_OWNER, GIT_REPO_NAME)');
            return NextResponse.json(
                { success: false, error: 'Server configuration error. Missing Git credentials.' },
                { status: 500 }
            );
        }

        // 1. Auth check
        try {
            await verifyAuth();
        } catch {
            return NextResponse.json(
                { success: false, error: AUTH_EXPIRED_MESSAGE },
                { status: 401 }
            );
        }

        // 2. Parse body
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid request format.' },
                { status: 400 }
            );
        }

        const { id, type, section, slug } = body;

        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Please specify an article to delete.' },
                { status: 400 }
            );
        }

        // --- PART 2: SEPARATE DRAFT & PUBLISHED DELETE LOGIC ---

        // DRAFT DELETE
        if (type === 'draft' || id.startsWith('draft-')) {
            logger.info(`[DELETE] Draft mode. ID: ${id}`);

            const result = await contentGit.deleteDraft(id);

            if (!result.success) {
                logger.error('[DELETE] Draft deletion failed:', result.userMessage);
                return NextResponse.json(
                    { success: false, error: result.userMessage || "Couldn't delete this draft. Please try again." },
                    { status: 500 }
                );
            }

            logger.info(`[DELETE] Draft deleted successfully: ${id}`);

            // PART 6 - STRUCTURED API RESPONSE
            return NextResponse.json(
                {
                    success: true,
                    type: 'draft',
                    slug: id,
                    revalidated: false
                },
                { status: 200 }
            );
        }

        // PUBLISHED DELETE
        if (type === 'published' || id.startsWith('published-')) {
            if (!section || typeof section !== 'string' || !VALID_SECTIONS.includes(section as Section)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid section specified.' },
                    { status: 400 }
                );
            }

            if (!slug || typeof slug !== 'string') {
                return NextResponse.json(
                    { success: false, error: 'Article identifier (slug) is missing.' },
                    { status: 400 }
                );
            }

            const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-');

            logger.info(`[DELETE] Published mode. Section: ${section}, Slug: ${safeSlug}`);

            // Wait for Git confirmation before proceeding
            const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);

            if (!result.success) {
                logger.error('[DELETE] Published article deletion failed:', result.userMessage);
                return NextResponse.json(
                    { success: false, error: result.userMessage || "Couldn't delete this article. Please try again." },
                    { status: 500 }
                );
            }

            logger.info(`[DELETE] Git commit successful for published article: ${section}/${safeSlug}`);

            // PART 3 - CACHE & ISR COORDINATION
            try {
                logger.info(`[DELETE] Triggering revalidation for /, /${section}, and /${section}/${safeSlug}`);
                revalidatePath('/', 'page');
                revalidatePath(`/${section}`, 'page');
                revalidatePath(`/${section}/${safeSlug}`, 'page');
            } catch (error) {
                logger.error('[DELETE] Revalidation failed:', error);
                return NextResponse.json(
                    { success: false, error: "Deletion succeeded but cache revalidation failed." },
                    { status: 500 }
                );
            }

            logger.info(`[DELETE] Published article deleted and revalidated successfully: ${section}/${safeSlug}`);

            // PART 6 - STRUCTURED API RESPONSE
            return NextResponse.json(
                {
                    success: true,
                    type: 'published',
                    slug: safeSlug,
                    revalidated: true
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Please specify the article type (draft or published).' },
            { status: 400 }
        );

    } catch (error) {
        logger.error('[DELETE] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Reject unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({ success: false, error: 'This action is not supported.' }, { status: 405 });
}

export async function POST(): Promise<NextResponse> {
    return NextResponse.json({ success: false, error: 'Use DELETE method to remove articles.' }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
    return NextResponse.json({ success: false, error: 'This action is not supported.' }, { status: 405 });
}

export async function PATCH(): Promise<NextResponse> {
    return NextResponse.json({ success: false, error: 'This action is not supported.' }, { status: 405 });
}
