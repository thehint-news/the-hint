/**
 * Draft API Route
 * POST /api/publish/draft - Save a draft
 * GET /api/publish/draft - Load a draft or get history
 * DELETE /api/publish/draft - Delete a draft
 * 
 * All operations are backed by Git commits.
 * Git is the single source of truth.
 * 
 * RULES:
 * - Drafts are stored in /content/drafts/{draftId}.json
 * - Each save = one Git commit
 * - User-friendly error messages only (no Git terminology)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    validateDraftInput,
    transformToDraftData,
    DraftArticleInput,
} from '@/lib/validation';
import { contentGit } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';

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

/**
 * POST - Save a draft
 * Validates minimally (headline + body required)
 * Creates new or overwrites existing draft
 * Commits: "Draft created: {{headline}}" or "Draft updated: {{headline}}"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
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

        const input = body as DraftArticleInput;

        // Validate with DRAFT validation (more lenient)
        const validationResult = validateDraftInput(input);

        if (!validationResult.isValid) {
            return userResponse(
                false,
                'Please complete the required fields.',
                { errors: validationResult.errors },
                400
            );
        }

        // Get existing draftId if provided (for overwrite)
        const existingDraftId = typeof input.draftId === 'string' ? input.draftId : undefined;

        // Transform to draft data format
        const draftData = transformToDraftData(input, existingDraftId);

        // Save using Git-backed storage
        const result = await contentGit.createDraft(
            {
                headline: draftData.headline,
                subheadline: draftData.subheadline,
                section: draftData.section,
                contentType: draftData.contentType,
                body: draftData.body,
                tags: draftData.tags,
                sources: draftData.sources,
                placement: draftData.placement,
            },
            existingDraftId
        );

        if (!result.success) {
            logger.error('Draft save failed', result.error);
            return userResponse(
                false,
                result.userMessage || 'We couldn\'t save this draft right now. Nothing was lost.',
                undefined,
                500
            );
        }

        return userResponse(
            true,
            'Draft saved.',
            {
                draftId: result.data?.draftId,
                savedAt: result.data?.savedAt,
            }
        );

    } catch (error) {
        logger.error('Unexpected error in draft save API', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
            undefined,
            500
        );
    }
}

/**
 * GET - Load a draft by ID or get draft history
 * Query params:
 *   ?id=<draftId> - Load specific draft
 *   ?history=true - Get all drafts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const draftId = searchParams.get('id');
        const historyMode = searchParams.get('history');

        // History mode - return all drafts
        if (historyMode === 'true') {
            const result = await contentGit.listDrafts();

            if (!result.success) {
                return userResponse(
                    false,
                    result.userMessage || 'Couldn\'t load drafts right now.',
                    undefined,
                    500
                );
            }

            return userResponse(
                true,
                result.userMessage,
                { drafts: result.data }
            );
        }

        // Load specific draft by ID
        if (!draftId) {
            return userResponse(
                false,
                'Please specify a draft to load.',
                { errors: [{ field: 'id', message: 'Provide ?id=<draftId> or ?history=true' }] },
                400
            );
        }

        const result = await contentGit.loadDraft(draftId);

        if (!result.success) {
            return userResponse(
                false,
                result.userMessage || 'Draft not found.',
                undefined,
                404
            );
        }

        return userResponse(
            true,
            'Draft loaded.',
            { draft: result.data }
        );

    } catch (error) {
        logger.error('Unexpected error in draft load API', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
            undefined,
            500
        );
    }
}

/**
 * DELETE - Delete a draft
 * Commits: "Draft deleted: {{headline}}"
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const draftId = searchParams.get('id');

        if (!draftId) {
            return userResponse(
                false,
                'Please specify a draft to delete.',
                { errors: [{ field: 'id', message: 'Provide ?id=<draftId>' }] },
                400
            );
        }

        const result = await contentGit.deleteDraft(draftId);

        if (!result.success) {
            return userResponse(
                false,
                result.userMessage || 'Couldn\'t delete this draft.',
                undefined,
                result.error?.type === 'NOT_FOUND' ? 404 : 500
            );
        }

        return userResponse(
            true,
            'Draft deleted.'
        );

    } catch (error) {
        logger.error('Unexpected error in draft delete API', error);
        return userResponse(
            false,
            'Something went wrong. Please try again.',
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

export async function PATCH(): Promise<NextResponse> {
    return userResponse(false, 'This action is not supported.', undefined, 405);
}
