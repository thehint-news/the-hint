import { NextRequest, NextResponse } from 'next/server';
import { contentGit } from '@/lib/git';
import { logger } from '@/lib/feedback/console-guard';
import { verifyAuth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { Section } from '@/lib/git/service';
import { clearArticleCache } from '@/lib/cache/article-cache';

/** Valid sections */
const VALID_SECTIONS: Section[] = ['politics', 'crime', 'court', 'opinion', 'world-affairs', 'local'];

const AUTH_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

/**
 * PART 5: DELETE LOCK MECHANISM
 * Prevents double-delete and parallel delete calls
 * Uses in-memory Map (resets on server restart, which is acceptable)
 */
const deleteLocks = new Map<string, { timestamp: number; operationId: string }>();
const LOCK_TTL_MS = 30000; // 30 seconds

/**
 * Acquire delete lock for an article
 * Returns operationId if acquired, null if already locked
 */
function acquireDeleteLock(articleId: string): string | null {
    const now = Date.now();
    const existing = deleteLocks.get(articleId);

    // Check if lock exists and is still valid
    if (existing && (now - existing.timestamp) < LOCK_TTL_MS) {
        logger.warn(`[DELETE-LOCK] Article ${articleId} is already being deleted (operation: ${existing.operationId})`);
        return null;
    }

    // Generate operation ID and acquire lock
    const operationId = `del-${now}-${Math.random().toString(36).substr(2, 5)}`;
    deleteLocks.set(articleId, { timestamp: now, operationId });

    // Clean up old locks periodically
    if (deleteLocks.size > 100) {
        cleanupOldLocks();
    }

    return operationId;
}

/**
 * Release delete lock for an article
 */
function releaseDeleteLock(articleId: string): void {
    deleteLocks.delete(articleId);
}

/**
 * Clean up expired locks to prevent memory leaks
 */
function cleanupOldLocks(): void {
    const now = Date.now();
    for (const [id, lock] of deleteLocks.entries()) {
        if ((now - lock.timestamp) > LOCK_TTL_MS) {
            deleteLocks.delete(id);
        }
    }
}

/**
 * PART 6: STRUCTURED API RESPONSE TYPES
 */
interface DeleteSuccessResponse {
    success: true;
    type: 'draft' | 'published';
    slug: string;
    revalidated: boolean;
    alreadyDeleted?: boolean;
    commitHash?: string;
    message: string;
}

interface DeleteErrorResponse {
    success: false;
    error: string;
    errorCode?: 'CONFLICT' | 'NOT_FOUND' | 'PERMISSION' | 'VALIDATION' | 'SERVER_ERROR' | 'ALREADY_DELETING';
}

type DeleteApiResponse = DeleteSuccessResponse | DeleteErrorResponse;

/**
 * PART 8: PRODUCTION ENVIRONMENT VALIDATION
 * Validates all required environment variables before any operation
 */
function validateEnvironment(): { valid: true } | { valid: false; error: string } {
    const missing: string[] = [];

    if (!process.env.GIT_TOKEN) missing.push('GIT_TOKEN');
    if (!process.env.GIT_REPO_OWNER) missing.push('GIT_REPO_OWNER');
    if (!process.env.GIT_REPO_NAME) missing.push('GIT_REPO_NAME');

    if (missing.length > 0) {
        const errorMsg = `Missing critical environment variables: ${missing.join(', ')}`;
        logger.error(`[DELETE] Environment validation failed: ${errorMsg}`);
        return { valid: false, error: errorMsg };
    }

    return { valid: true };
}

/**
 * PART 3: CACHE & ISR COORDINATION
 * Triggers revalidation for all affected paths
 * Returns true if all revalidations succeeded, false otherwise
 */
function triggerRevalidation(paths: string[], operationId: string): { success: boolean; results: { path: string; success: boolean; error?: string }[] } {
    logger.info(`[DELETE-REVALIDATE] [${operationId}] Triggering revalidation for ${paths.length} paths: ${paths.join(', ')}`);

    const results: { path: string; success: boolean; error?: string }[] = [];

    for (const path of paths) {
        try {
            revalidatePath(path, 'page');
            results.push({ path, success: true });
            logger.info(`[DELETE-REVALIDATE] [${operationId}] ✓ Revalidated: ${path}`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.push({ path, success: false, error: errorMsg });
            logger.error(`[DELETE-REVALIDATE] [${operationId}] ✗ Failed to revalidate ${path}:`, error);
        }
    }

    const allSuccess = results.every(r => r.success);

    if (allSuccess) {
        logger.info(`[DELETE-REVALIDATE] [${operationId}] All revalidations successful`);
    } else {
        const failed = results.filter(r => !r.success).map(r => r.path);
        logger.error(`[DELETE-REVALIDATE] [${operationId}] Some revalidations failed: ${failed.join(', ')}`);
    }

    return { success: allSuccess, results };
}

/**
 * DELETE - Remove an article (draft or published)
 * 
 * ATOMIC: Waits for Git commit confirmation before returning success
 * DETERMINISTIC: Clear success/failure states with structured responses
 * CACHE-AWARE: Triggers ISR revalidation immediately after successful delete
 * RACE-CONDITION SAFE: Delete locks prevent parallel deletes
 * PRODUCTION-RELIABLE: Comprehensive logging and environment validation
 * 
 * IDEMPOTENT: Safe to call multiple times - returns success if already deleted
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<DeleteApiResponse>> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // PART 7: LOGGING - Delete request received
    logger.info(`[DELETE-API] [${requestId}] ========== DELETE REQUEST START ==========`);

    try {
        // PART 8: PRODUCTION ENVIRONMENT VALIDATION
        const envCheck = validateEnvironment();
        if (!envCheck.valid) {
            logger.error(`[DELETE-API] [${requestId}] Environment validation failed`);
            return NextResponse.json(
                { success: false, error: 'Server configuration error. Please contact support.', errorCode: 'SERVER_ERROR' },
                { status: 500 }
            );
        }

        // 1. Auth check
        logger.info(`[DELETE-API] [${requestId}] Verifying authentication...`);
        try {
            await verifyAuth();
            logger.info(`[DELETE-API] [${requestId}] Authentication verified`);
        } catch {
            logger.warn(`[DELETE-API] [${requestId}] Authentication failed - session expired`);
            return NextResponse.json(
                { success: false, error: AUTH_EXPIRED_MESSAGE, errorCode: 'PERMISSION' },
                { status: 401 }
            );
        }

        // 2. Parse body
        logger.info(`[DELETE-API] [${requestId}] Parsing request body...`);
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            logger.info(`[DELETE-API] [${requestId}] Request body parsed: ${JSON.stringify({ id: body.id, type: body.type, section: body.section, slug: body.slug })}`);
        } catch {
            logger.error(`[DELETE-API] [${requestId}] Failed to parse request body`);
            return NextResponse.json(
                { success: false, error: 'Invalid request format.', errorCode: 'VALIDATION' },
                { status: 400 }
            );
        }

        const { id, type, section, slug } = body;

        if (!id || typeof id !== 'string') {
            logger.warn(`[DELETE-API] [${requestId}] Missing or invalid article ID`);
            return NextResponse.json(
                { success: false, error: 'Please specify an article to delete.', errorCode: 'VALIDATION' },
                { status: 400 }
            );
        }

        // PART 5: PREVENT DOUBLE DELETE - Acquire lock
        const lockId = acquireDeleteLock(id);
        if (!lockId) {
            logger.warn(`[DELETE-API] [${requestId}] Delete already in progress for article: ${id}`);
            return NextResponse.json(
                { success: false, error: 'Delete already in progress for this article. Please wait.', errorCode: 'ALREADY_DELETING' },
                { status: 429 }
            );
        }

        logger.info(`[DELETE-API] [${requestId}] Acquired delete lock: ${lockId}`);

        try {
            // PART 2: SEPARATE DRAFT & PUBLISHED DELETE LOGIC

            // DRAFT DELETE
            if (type === 'draft' || id.startsWith('draft-')) {
                logger.info(`[DELETE-API] [${requestId}] Routing to DRAFT delete handler | id: ${id}`);

                const result = await contentGit.deleteDraft(id);

                if (!result.success) {
                    logger.error(`[DELETE-API] [${requestId}] Draft deletion failed:`, result.userMessage);
                    return NextResponse.json(
                        { success: false, error: result.userMessage || "Couldn't delete this draft. Please try again.", errorCode: 'SERVER_ERROR' },
                        { status: 500 }
                    );
                }

                logger.info(`[DELETE-API] [${requestId}] Draft deleted successfully: ${id}`);

                // CACHE INVALIDATION: Clear article cache after draft delete
                clearArticleCache();

                // PART 6 - STRUCTURED API RESPONSE
                const response: DeleteSuccessResponse = {
                    success: true,
                    type: 'draft',
                    slug: id,
                    revalidated: false,
                    alreadyDeleted: result.data?.alreadyDeleted,
                    commitHash: result.data?.commitHash,
                    message: result.userMessage
                };

                logger.info(`[DELETE-API] [${requestId}] ========== DELETE REQUEST SUCCESS (DRAFT) ==========`);
                return NextResponse.json(response, { status: 200 });
            }

            // PUBLISHED DELETE
            if (type === 'published' || id.startsWith('published-')) {
                logger.info(`[DELETE-API] [${requestId}] Routing to PUBLISHED delete handler`);

                // Validate section
                if (!section || typeof section !== 'string' || !VALID_SECTIONS.includes(section as Section)) {
                    logger.warn(`[DELETE-API] [${requestId}] Invalid section: ${section}`);
                    return NextResponse.json(
                        { success: false, error: 'Invalid section specified.', errorCode: 'VALIDATION' },
                        { status: 400 }
                    );
                }

                // Validate slug
                if (!slug || typeof slug !== 'string') {
                    logger.warn(`[DELETE-API] [${requestId}] Missing or invalid slug`);
                    return NextResponse.json(
                        { success: false, error: 'Article identifier (slug) is missing.', errorCode: 'VALIDATION' },
                        { status: 400 }
                    );
                }

                // BUG FIX: Removed incorrect ASCII-only sanitization that was breaking Unicode slugs
                // The slug is already validated/sanitized when created via generateSlug() which supports Unicode
                // Replacing Unicode chars with '-' was causing mismatches (e.g., 'ಮೊದಲ-ಲೇಖನ' -> '-------')
                // Only trim whitespace and validate it's not empty after trim
                const safeSlug = slug.trim();
                if (!safeSlug) {
                    logger.warn(`[DELETE-API] [${requestId}] Empty slug after trim`);
                    return NextResponse.json(
                        { success: false, error: 'Invalid article slug.', errorCode: 'VALIDATION' },
                        { status: 400 }
                    );
                }
                logger.info(`[DELETE-API] [${requestId}] Section: ${section}, Slug: ${safeSlug}`);

                // Wait for Git confirmation before proceeding
                const result = await contentGit.deletePublishedArticle(section as Section, safeSlug);

                if (!result.success || !result.data) {
                    logger.error(`[DELETE-API] [${requestId}] Published article deletion failed:`, result.userMessage);
                    return NextResponse.json(
                        { success: false, error: result.userMessage || "Couldn't delete this article. Please try again.", errorCode: 'SERVER_ERROR' },
                        { status: 500 }
                    );
                }

                logger.info(`[DELETE-API] [${requestId}] Git commit confirmed for published article`);

                // CACHE INVALIDATION: Clear article cache immediately after confirmed Git delete
                clearArticleCache();

                // PART 3 - CACHE & ISR COORDINATION
                // Must trigger revalidation BEFORE returning success
                const revalidationPaths = result.data.revalidationPaths;
                logger.info(`[DELETE-API] [${requestId}] Triggering ISR revalidation for ${revalidationPaths.length} paths`);

                const revalidationResult = triggerRevalidation(revalidationPaths, requestId);

                if (!revalidationResult.success) {
                    // PART 10: FAILURE CONDITIONS - Revalidation failure is a hard failure
                    logger.error(`[DELETE-API] [${requestId}] CRITICAL: Revalidation failed after successful Git delete`);

                    // Note: The article is deleted from Git but cache is stale
                    // This is a partial success - we return error but include details
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Article was deleted but cache revalidation failed. The page may show stale content. Please contact support.",
                            errorCode: 'SERVER_ERROR'
                        },
                        { status: 500 }
                    );
                }

                logger.info(`[DELETE-API] [${requestId}] ISR revalidation successful for all paths`);

                // PART 6 - STRUCTURED API RESPONSE
                const response: DeleteSuccessResponse = {
                    success: true,
                    type: 'published',
                    slug: safeSlug,
                    revalidated: true,
                    alreadyDeleted: result.data.alreadyDeleted,
                    commitHash: result.data.commitHash,
                    message: result.userMessage
                };

                logger.info(`[DELETE-API] [${requestId}] ========== DELETE REQUEST SUCCESS (PUBLISHED) ==========`);
                return NextResponse.json(response, { status: 200 });
            }

            // Unknown type
            logger.warn(`[DELETE-API] [${requestId}] Unknown article type: ${type}`);
            return NextResponse.json(
                { success: false, error: 'Please specify the article type (draft or published).', errorCode: 'VALIDATION' },
                { status: 400 }
            );

        } finally {
            // PART 5: Always release the lock
            releaseDeleteLock(id);
            logger.info(`[DELETE-API] [${requestId}] Released delete lock for: ${id}`);
        }

    } catch (error) {
        logger.error(`[DELETE-API] [${requestId}] UNEXPECTED ERROR:`, error);
        return NextResponse.json(
            { success: false, error: 'Something went wrong. Please try again.', errorCode: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}

/**
 * Reject unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse<DeleteErrorResponse>> {
    return NextResponse.json(
        { success: false, error: 'This action is not supported.', errorCode: 'VALIDATION' },
        { status: 405 }
    );
}

export async function POST(): Promise<NextResponse<DeleteErrorResponse>> {
    return NextResponse.json(
        { success: false, error: 'Use DELETE method to remove articles.', errorCode: 'VALIDATION' },
        { status: 405 }
    );
}

export async function PUT(): Promise<NextResponse<DeleteErrorResponse>> {
    return NextResponse.json(
        { success: false, error: 'This action is not supported.', errorCode: 'VALIDATION' },
        { status: 405 }
    );
}

export async function PATCH(): Promise<NextResponse<DeleteErrorResponse>> {
    return NextResponse.json(
        { success: false, error: 'This action is not supported.', errorCode: 'VALIDATION' },
        { status: 405 }
    );
}
