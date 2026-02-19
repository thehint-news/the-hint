/**
 * Duplicate Article API Route
 * POST /api/publish/duplicate
 * 
 * Creates a new draft from an existing article (draft or published).
 * Title prefixed with "Copy of..."
 * New draft ID generated.
 * 
 * All operations backed by Git.
 */

import { NextRequest, NextResponse } from 'next/server';
import { contentGit, PublishedArticleData } from '@/lib/git';
import { Section, ContentType, Placement } from '@/lib/validation';
import { verifyAuth } from '@/lib/auth/session';

/**
 * Generate a unique draft ID
 */
function generateDraftId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `draft-${timestamp}-${random}`;
}

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
            ...(data && { data }),
        },
        { status }
    );
}

/** Valid sections */
const VALID_SECTIONS: Section[] = ['politics', 'crime', 'court', 'opinion', 'world-affairs'];

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
 * POST - Duplicate an article
 * Creates a new draft from existing content (draft or published)
 * Commits: "Draft created: Copy of {{headline}}"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Enforce strict session
        const authResponse = await requireAuth();
        if (authResponse) return authResponse;

        const body = await request.json();
        const { id, type, section, slug } = body;

        if (!id) {
            return userResponse(
                false,
                'Please specify an article to duplicate.',
                undefined,
                400
            );
        }

        const newDraftId = generateDraftId();

        // Handle draft duplication
        if (type === 'draft' || (typeof id === 'string' && id.startsWith('draft-'))) {
            const draftId = id;
            const loadResult = await contentGit.loadDraft(draftId);

            if (!loadResult.success || !loadResult.data) {
                return userResponse(
                    false,
                    'Draft not found. It may have been deleted.',
                    undefined,
                    404
                );
            }

            const existingDraft = loadResult.data;

            // Create new draft with "Copy of" prefix
            const result = await contentGit.createDraft(
                {
                    headline: `Copy of ${existingDraft.headline}`,
                    subheadline: existingDraft.subheadline,
                    section: existingDraft.section,
                    contentType: existingDraft.contentType,
                    body: existingDraft.body,
                    tags: existingDraft.tags,
                    sources: existingDraft.sources,
                    placement: existingDraft.placement,
                },
                newDraftId
            );

            if (!result.success) {
                return userResponse(
                    false,
                    result.userMessage || 'Couldn\'t duplicate this draft.',
                    undefined,
                    500
                );
            }

            return userResponse(
                true,
                'Article duplicated successfully.',
                {
                    draftId: result.data?.draftId,
                    headline: `Copy of ${existingDraft.headline}`,
                }
            );
        }

        // Handle published article duplication
        if (type === 'published' || (typeof id === 'string' && id.startsWith('published-'))) {
            if (!section || !slug) {
                return userResponse(
                    false,
                    'Article identifier is incomplete.',
                    undefined,
                    400
                );
            }

            // Validate section
            if (!VALID_SECTIONS.includes(section as Section)) {
                return userResponse(
                    false,
                    'Invalid section specified.',
                    undefined,
                    400
                );
            }

            // Load published article
            const publishedResult = await contentGit.listPublishedArticles();

            if (!publishedResult.success || !publishedResult.data) {
                return userResponse(
                    false,
                    'Couldn\'t access published articles.',
                    undefined,
                    500
                );
            }

            const article = publishedResult.data.find(
                (a: PublishedArticleData) => a.section === section && a.slug === slug
            );

            if (!article) {
                return userResponse(
                    false,
                    'Article not found.',
                    undefined,
                    404
                );
            }

            // Validate and default contentType
            const validContentType: ContentType =
                (article.contentType === 'opinion') ? 'opinion' : 'news';

            // Validate and default placement
            const validPlacements: Placement[] = ['lead', 'top', 'standard'];
            const validPlacement: Placement = validPlacements.includes(article.placement as Placement)
                ? (article.placement as Placement)
                : 'standard';

            // Create new draft from published article
            const result = await contentGit.createDraft(
                {
                    headline: `Copy of ${article.title}`,
                    subheadline: article.subtitle,
                    section: section as Section,
                    contentType: validContentType,
                    body: article.body,
                    tags: article.tags,
                    sources: article.sources,
                    placement: validPlacement,
                },
                newDraftId
            );

            if (!result.success) {
                return userResponse(
                    false,
                    result.userMessage || 'Couldn\'t duplicate this article.',
                    undefined,
                    500
                );
            }

            return userResponse(
                true,
                'Article duplicated successfully.',
                {
                    draftId: result.data?.draftId,
                    headline: `Copy of ${article.title}`,
                }
            );
        }

        return userResponse(
            false,
            'Please specify the article type (draft or published).',
            undefined,
            400
        );

    } catch (error) {
        console.error('Error duplicating article:', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
            undefined,
            500
        );
    }
}
