'use client';

/**
 * Publishing Console Page
 * Internal editorial console for The Hint newspaper.
 * 
 * This is a SINGLE PAGE that serves TWO purposes:
 * 1. Long-form article editor
 * 2. Editorial content database (CRUD)
 * 
 * RULES:
 * - UI contains ZERO business logic
 * - All validation happens server-side
 * - Client validation is only UX assistance
 * - Publishing must be explicit
 * - Drafts and published articles are strictly separated
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    EditorialToolbar,
    ArticleEditor,
    ArticleDatabase,
    MobileSettingsPanel,
    MobileActionBar,
    ArticleFormData,
    ArticleEntry,
    WorkspaceMode,
    FieldErrors,
    PreviewData,
    ApiResponse,
    INITIAL_FORM_DATA,
} from '@/components/publish';
import { EditorialToast, type ToastData } from '@/components/feedback';
import {
    ErrorCodes,
    SuccessCodes,
    transformApiErrors,
    getFirstError,
    getErrorMessage,
    getSuccessMessage,
    logger,
} from '@/lib/feedback';
import { serializeBlocksToMarkdown } from '@/lib/content/block-parser';
import { useIsMobile } from '@/hooks/useIsMobile';
import styles from './page.module.css';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { SessionExpiryModal } from '@/components/publish/common/SessionExpiryModal';

/** Client-side UX validation hints (NOT business logic) */
function getClientHints(formData: ArticleFormData): Record<string, string> {
    const hints: Record<string, string> = {};

    // Safely access fields with null-checks to prevent crashes on undefined data
    const headline = formData?.headline || '';
    const thumbnail = formData?.thumbnail || '';

    if (headline && headline.length < 10) {
        hints.headline = `${10 - headline.length} more characters needed`;
    }
    if (formData?.contentType === 'opinion' && formData?.section !== 'opinion') {
        hints.contentType = 'Opinion articles must be in Opinion section';
    }
    if (!thumbnail) {
        hints.thumbnail = 'Thumbnail is required for publishing';
    }

    return hints;
}

/** Check if form has minimum required fields for publishing */
function canPublish(formData: ArticleFormData): boolean {
    // bodyBlocks is the canonical content source; body is legacy fallback
    const hasContent = (formData?.bodyBlocks && formData.bodyBlocks.length > 0) || (formData?.body || '').trim();
    return !!(
        (formData?.headline || '').trim() &&
        (formData?.subheadline || '').trim() &&
        hasContent &&
        formData?.section &&
        formData?.thumbnail
    );
}

export default function PublishPage() {
    // Workspace mode
    const [mode, setMode] = useState<WorkspaceMode>('editor');

    // Form state
    const [formData, setFormData] = useState<ArticleFormData>(INITIAL_FORM_DATA);
    const [lastSavedFormData, setLastSavedFormData] = useState<ArticleFormData>(INITIAL_FORM_DATA);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Articles list for database mode
    const [articles, setArticles] = useState<ArticleEntry[]>([]);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);
    const [articlesCached, setArticlesCached] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    // Optimistic delete: track which article IDs are currently being deleted
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    // Toast notifications
    const [toast, setToast] = useState<ToastData | null>(null);

    // Mobile state
    const isMobile = useIsMobile();
    const [showMobileSettings, setShowMobileSettings] = useState(false);

    // Client hints
    const clientHints = getClientHints(formData);

    // Cache staleness threshold (5 minutes)
    const CACHE_TTL_MS = 5 * 60 * 1000;

    /**
     * Generate unique toast ID
     */
    const generateToastId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    /**
     * Show toast notification (editorial style)
     */
    const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, options?: { guidance?: string; link?: { url: string; label: string } }) => {
        setToast({
            id: generateToastId(),
            type,
            message,
            guidance: options?.guidance,
            link: options?.link,
            timeout: type === 'error' ? 6000 : 4000,
        });
    }, []);

    /**
     * Show error from error code (uses translation system)
     */
    const showErrorFromCode = useCallback((code: typeof ErrorCodes[keyof typeof ErrorCodes]) => {
        const translation = getErrorMessage(code);
        showToast(
            translation.severity === 'warning' ? 'warning' : 'error',
            translation.message,
            { guidance: translation.guidance }
        );
    }, [showToast]);

    /**
     * Show success from success code (uses translation system)
     */
    const showSuccessFromCode = useCallback((code: typeof SuccessCodes[keyof typeof SuccessCodes], link?: { url: string; label: string }) => {
        const translation = getSuccessMessage(code);
        showToast('success', translation.message, { link });
    }, [showToast]);

    /**
     * Build API payload from form data.
     * Generates legacy `body` from blocks at save time only.
     * This is a ONE-DIRECTIONAL conversion for backward compatibility.
     */
    const buildPayload = useCallback(() => {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        const sourcesArray = formData.sources.split(',').map(s => s.trim()).filter(Boolean);

        // Generate legacy body from blocks for backward compat (one-directional, never flows back to editor)
        const legacyBody = formData.bodyBlocks && formData.bodyBlocks.length > 0
            ? serializeBlocksToMarkdown(formData.bodyBlocks)
            : formData.body;

        return {
            headline: formData.headline,
            subheadline: formData.subheadline,
            section: formData.section,
            contentType: formData.contentType,
            body: legacyBody,
            bodyBlocks: formData.bodyBlocks,
            tags: tagsArray,
            sources: sourcesArray,
            placement: formData.placement,
            draftId: formData.draftId,
            status: formData.status,
            slug: formData.slug || undefined,
            thumbnail: formData.thumbnail || undefined,
        };
    }, [formData]);

    /**
     * Parse field errors from API response (with editorial translation)
     */
    const parseFieldErrors = useCallback((errors?: { field: string; message: string }[]): FieldErrors => {
        if (!errors) return {};

        // Use the editorial translation system
        const transformed = transformApiErrors(errors);
        const result: FieldErrors = {};

        for (const error of transformed) {
            result[error.field] = error.message;
        }

        // Log original errors for debugging (development only)
        logger.debug('Field errors transformed', { original: errors, translated: result });

        return result;
    }, []);

    /**
     * Fetch articles for database mode
     * Uses client-side cache to avoid redundant API calls on tab switches
     */
    const fetchArticles = useCallback(async (forceRefresh = false) => {
        // Skip fetch if data is cached and fresh (unless force refresh)
        if (!forceRefresh && articlesCached && (Date.now() - lastFetchTime) < CACHE_TTL_MS) {
            return;
        }

        setIsLoadingArticles(true);
        try {
            const response = await fetch('/api/publish/articles', { cache: 'no-store' });
            if (response.status === 401) {
                window.location.href = '/newsroom';
                return;
            }
            const result: ApiResponse = await response.json();

            if (result.success && result.data?.articles) {
                setArticles(result.data.articles as ArticleEntry[]);
                setArticlesCached(true);
                setLastFetchTime(Date.now());
            } else {
                showErrorFromCode(ErrorCodes.SERVER_INTERNAL_ERROR);
            }
        } catch (error) {
            logger.error('Fetch articles failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        } finally {
            setIsLoadingArticles(false);
        }
    }, [showErrorFromCode, articlesCached, lastFetchTime, CACHE_TTL_MS]);

    /**
     * Load articles when switching to database mode
     * Uses cached data if available — only fetches on first load or when stale
     */
    useEffect(() => {
        if (mode !== 'editor') {
            fetchArticles();
        }
    }, [mode, fetchArticles]);

    /**
     * Handle mode change
     */
    const handleModeChange = useCallback((newMode: WorkspaceMode) => {
        setMode(newMode);
        setShowPreview(false);
    }, []);

    /**
     * Handle new article
     */
    const handleNewArticle = useCallback(() => {
        setFormData(INITIAL_FORM_DATA);
        setLastSavedFormData(INITIAL_FORM_DATA);
        setFieldErrors({});
        setShowPreview(false);
        setPreviewData(null);
        setMode('editor');
    }, []);

    /**
     * Handle form changes
     */
    const handleFormChange = useCallback((data: ArticleFormData) => {
        setFormData(data);
        // Clear field errors when user makes changes
        const changedFields = Object.keys(data).filter(
            key => data[key as keyof ArticleFormData] !== formData[key as keyof ArticleFormData]
        );
        if (changedFields.length > 0) {
            setFieldErrors(prev => {
                const next = { ...prev };
                for (const field of changedFields) {
                    delete next[field];
                }
                return next;
            });
        }
    }, [formData]);

    /**
     * Save Draft
     */
    const handleSaveDraft = useCallback(async (): Promise<boolean> => {
        setIsSaving(true);
        setFieldErrors({});

        try {
            const payload = buildPayload();
            const response = await fetch('/api/publish/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                window.location.href = '/newsroom';
                return false;
            }

            const result: ApiResponse = await response.json();

            if (result.success && result.data?.draftId) {
                const updatedData = { ...payload, draftId: result.data!.draftId! } as unknown as ArticleFormData;
                setFormData(prev => ({ ...prev, draftId: result.data!.draftId! }));
                setLastSavedFormData(updatedData);
                showSuccessFromCode(SuccessCodes.DRAFT_SAVED);
                return true;
            } else if (!result.success && result.errors?.length) {
                setFieldErrors(parseFieldErrors(result.errors));
                const firstError = getFirstError(transformApiErrors(result.errors));
                if (firstError) {
                    showToast('error', firstError.message);
                }
                return false;
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
                return false;
            }
        } catch (error) {
            logger.error('Draft save failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [buildPayload, parseFieldErrors, showToast, showSuccessFromCode, showErrorFromCode]);

    /**
     * Logout with Auto-Save
     */
    const handleLogout = useCallback(async (force = false) => {
        // Auto-save if we have content
        const hasContent = formData.headline || formData.body || formData.draftId;
        const isDirty = JSON.stringify(formData) !== JSON.stringify(lastSavedFormData);

        if (hasContent && isDirty) {
            try {
                showToast('info', 'Saving progress before logout...');
                const saved = await handleSaveDraft();
                if (!saved && !force) {
                    showToast('error', 'Could not save draft. Logout cancelled to prevent data loss.');
                    return; // Abort logout
                }
            } catch (e) {
                logger.error('Auto-save failed', e);
                if (!force) {
                    showToast('error', 'Auto-save failed. Logout cancelled.');
                    return;
                }
            }
        } else if (hasContent && !isDirty && force) {
            showToast('info', 'No changes made. Redirecting...');
        }

        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/newsroom';
        } catch (error) {
            logger.error('Logout failed', error);
            // Force redirect anyway
            window.location.href = '/newsroom';
        }
    }, [formData, lastSavedFormData, handleSaveDraft, showToast]);

    // Stable ref for logout to prevent timer re-subscriptions
    const handleLogoutRef = useRef(handleLogout);
    useEffect(() => {
        handleLogoutRef.current = handleLogout;
    }, [handleLogout]);

    const stableLogout = useCallback(async (force = false) => {
        await handleLogoutRef.current(force);
    }, []);

    /**
     * Preview
     */
    const handlePreview = useCallback(async () => {
        setIsPreviewLoading(true);

        try {
            const payload = buildPayload();
            const response = await fetch('/api/publish/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                window.location.href = '/newsroom';
                return;
            }

            const result: ApiResponse = await response.json();

            if (result.success && result.data?.preview) {
                setPreviewData(result.data.preview);
                setShowPreview(true);
                showSuccessFromCode(SuccessCodes.PREVIEW_READY);
            } else {
                showErrorFromCode(ErrorCodes.SERVER_INTERNAL_ERROR);
            }
        } catch (error) {
            logger.error('Preview generation failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        } finally {
            setIsPreviewLoading(false);
        }
    }, [buildPayload, showSuccessFromCode, showErrorFromCode]);

    /**
     * Execute Publish (after confirmation)
     */
    const executePublish = useCallback(async () => {
        setIsPublishing(true);
        setFieldErrors({});

        try {
            const payload = { ...buildPayload(), status: 'published' };
            const response = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                window.location.href = '/newsroom';
                return;
            }

            const result: ApiResponse = await response.json();

            if (result.success) {
                setFormData(INITIAL_FORM_DATA);
                setLastSavedFormData(INITIAL_FORM_DATA);
                setShowPreview(false);
                // Invalidate articles cache so database view refreshes
                setArticlesCached(false);
                showSuccessFromCode(
                    SuccessCodes.ARTICLE_PUBLISHED,
                    result.data?.url ? { url: result.data.url, label: 'View Article' } : undefined
                );
            } else if (result.errors?.length) {
                setFieldErrors(parseFieldErrors(result.errors));
                // Get first error and show as toast
                const firstError = getFirstError(transformApiErrors(result.errors));
                if (firstError) {
                    showToast('error', firstError.message);
                }
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
            }
        } catch (error) {
            logger.error('Publish failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        } finally {
            setIsPublishing(false);
        }
    }, [buildPayload, parseFieldErrors, showToast, showSuccessFromCode, showErrorFromCode]);

    /**
     * Handle Publish Click
     */
    const handlePublish = useCallback(() => {
        if (!formData.thumbnail) {
            showToast('warning', 'Thumbnail is not set. Please upload a thumbnail.');
            return;
        }

        if (!canPublish(formData)) {
            showToast('warning', 'Complete required fields to publish.');
            return;
        }
        setShowConfirmDialog(true);
    }, [formData, showToast]);

    /**
     * Edit article (from database view)
     */
    const handleEdit = useCallback((article: ArticleEntry) => {
        // The API returns article content nested in the 'data' property
        const data = article.data;

        const newData = {
            headline: data.headline || article.title || '',
            subheadline: data.subheadline || '',
            section: data.section || article.section || 'politics',
            contentType: data.contentType || 'news',
            body: data.body || '',
            bodyBlocks: data.bodyBlocks || [],
            tags: typeof data.tags === 'string' ? data.tags : (Array.isArray(data.tags) ? (data.tags as string[]).join(', ') : ''),
            sources: typeof data.sources === 'string' ? data.sources : (Array.isArray(data.sources) ? (data.sources as string[]).join(', ') : ''),
            placement: data.placement || article.placement || 'standard',
            thumbnail: data.thumbnail || '',
            draftId: article.status === 'draft' ? article.id : (data.draftId || null),
            status: article.status === 'published' ? 'published' : 'draft',
            slug: data.slug || article.slug || '',
        } as ArticleFormData;

        setFormData(newData);
        setLastSavedFormData(newData);
        setFieldErrors({});
        setShowPreview(false);
        setMode('editor');
    }, []);

    /**
     * Duplicate article
     */
    const handleDuplicate = useCallback(async (article: ArticleEntry) => {
        try {
            const response = await fetch('/api/publish/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: article.id,
                    section: article.section,
                    slug: article.slug,
                }),
            });

            if (response.status === 401) {
                window.location.href = '/newsroom';
                return;
            }

            const result: ApiResponse = await response.json();

            if (result.success) {
                showToast('success', `Created a copy of "${result.data?.headline}"`);
                // Force refresh after mutation
                fetchArticles(true);
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
            }
        } catch (error) {
            logger.error('Duplicate failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        }
    }, [fetchArticles, showToast, showErrorFromCode]);

    const handleDelete = useCallback(async (article: ArticleEntry) => {
        const articleId = article.id;

        // Guard: prevent duplicate in-flight deletes
        if (deletingIds.has(articleId)) return;

        // 1. Lock this article — triggers spinner + disabled state in ArticleDatabase
        setDeletingIds(prev => new Set(prev).add(articleId));

        // 2. Fire API call and WAIT for the response
        try {
            const response = await fetch('/api/publish/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: article.id,
                    type: article.status,
                    section: article.section,
                    slug: article.slug,
                }),
            });

            if (response.status === 401) {
                window.location.href = '/newsroom';
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                // 3. IMMEDIATELY remove from UI state
                setArticles(prev => prev.filter(a => a.id !== articleId));

                // Show confirmation toast
                showToast('success', 'Article permanently removed.');

                // Trigger background refresh to ensure state stays in sync
                fetchArticles(true);
            } else {
                // 4. FAILURE — show error
                showToast('error', result.error || "We couldn't complete the deletion. Please try again.");
            }
        } catch (error) {
            logger.error('Delete failed', error);
            showToast('error', "Network error. Please check your connection and try again.");
        } finally {
            // ALWAYS unlock the article
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(articleId);
                return next;
            });
        }
    }, [deletingIds, showToast, fetchArticles]);

    /**
     * Close preview
     */
    const handleClosePreview = useCallback(() => {
        setShowPreview(false);
    }, []);

    // Session Timer Hook
    const { timeLeft, showWarning: showSessionWarning, isExtending: isSessionExtending, handleExtendSession, handleLogout: triggerLogout } = useSessionTimer({
        onLogout: stableLogout,
        onExtendSuccess: () => showToast('success', 'Session extended for 5 minutes'),
    });

    return (
        <div className={`${styles.page} ${isMobile ? styles.mobile : ''}`}>
            <SessionExpiryModal
                isOpen={showSessionWarning}
                timeLeftMs={timeLeft}
                onExtend={handleExtendSession}
                onLogout={triggerLogout}
                isExtending={isSessionExtending}
            />

            {/* Toast Notifications */}
            <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}>
                <EditorialToast toast={toast} onDismiss={() => setToast(null)} />
            </div>

            {/* Editorial Toolbar - Full on desktop, simplified on mobile */}
            <EditorialToolbar
                mode={mode}
                onModeChange={handleModeChange}
                onNewArticle={handleNewArticle}
                onSaveDraft={handleSaveDraft}
                onPreview={handlePreview}
                onPublish={handlePublish}
                onLogout={triggerLogout}
                isSaving={isSaving}
                isPreviewLoading={isPreviewLoading}
                isPublishing={isPublishing}
                draftId={formData.draftId}
                isMobile={isMobile}
                timeLeft={timeLeft}
            />

            {/* Main Workspace */}
            <main className={styles.workspace}>
                {mode === 'editor' ? (
                    <ArticleEditor
                        formData={formData}
                        onFormChange={handleFormChange}
                        fieldErrors={fieldErrors}
                        clientHints={clientHints}
                        previewData={previewData}
                        showPreview={showPreview}
                        onClosePreview={handleClosePreview}
                        onBackToList={() => handleModeChange('all')}
                        isMobile={isMobile}
                    />
                ) : (
                    <ArticleDatabase
                        articles={articles}
                        isLoading={isLoadingArticles}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        deletingIds={deletingIds}
                    />
                )}
            </main>

            {/* Mobile Settings Panel (Bottom Sheet) */}
            {isMobile && (
                <MobileSettingsPanel
                    formData={formData}
                    onFormChange={handleFormChange}
                    fieldErrors={fieldErrors}
                    clientHints={clientHints}
                    isOpen={showMobileSettings}
                    onClose={() => setShowMobileSettings(false)}
                />
            )}

            {/* Mobile Action Bar (Fixed Bottom) */}
            {isMobile && (
                <MobileActionBar
                    onOpenSettings={() => setShowMobileSettings(true)}
                    onSaveDraft={handleSaveDraft}
                    onPreview={handlePreview}
                    onPublish={handlePublish}
                    isSaving={isSaving}
                    isPreviewLoading={isPreviewLoading}
                    isPublishing={isPublishing}
                    canPublish={canPublish(formData)}
                    isEditorMode={mode === 'editor'}
                />
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className={styles.confirmOverlay}>
                    <div className={styles.confirmDialog}>
                        <h3 className={styles.confirmTitle}>Confirm Publication</h3>
                        <p className={styles.confirmText}>
                            Are you sure you want to publish this article?
                            <br /><br />
                            <strong>Headline:</strong> {formData.headline}<br />
                            <strong>Section:</strong> {formData.section}
                            <br /><br />
                            This action is <strong>IRREVERSIBLE</strong>. The article will immediately go live.
                        </p>
                        <div className={styles.confirmActions}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowConfirmDialog(false); executePublish(); }}
                                className={styles.confirmButton}
                            >
                                Publish Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
