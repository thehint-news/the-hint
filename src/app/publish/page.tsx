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

import { useState, useCallback, useEffect } from 'react';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import styles from './page.module.css';

/** Client-side UX validation hints (NOT business logic) */
function getClientHints(formData: ArticleFormData): Record<string, string> {
    const hints: Record<string, string> = {};

    if (formData.headline && formData.headline.length < 10) {
        hints.headline = `${10 - formData.headline.length} more characters needed`;
    }
    if (formData.headline.length > 150) {
        hints.headline = `${formData.headline.length - 150} characters over limit`;
    }
    if (formData.subheadline.length > 200) {
        hints.subheadline = `${formData.subheadline.length - 200} characters over limit`;
    }
    if (formData.contentType === 'opinion' && formData.section !== 'opinion') {
        hints.contentType = 'Opinion articles must be in Opinion section';
    }
    if (!formData.thumbnail) {
        hints.thumbnail = 'Thumbnail is required for publishing';
    }

    return hints;
}

/** Check if form has minimum required fields for publishing */
function canPublish(formData: ArticleFormData): boolean {
    return !!(
        formData.headline.trim() &&
        formData.subheadline.trim() &&
        formData.body.trim() &&
        formData.section &&
        formData.thumbnail // Thumbnail is now mandatory
    );
}

export default function PublishPage() {
    // Workspace mode
    const [mode, setMode] = useState<WorkspaceMode>('editor');

    // Form state
    const [formData, setFormData] = useState<ArticleFormData>(INITIAL_FORM_DATA);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Articles list for database mode
    const [articles, setArticles] = useState<ArticleEntry[]>([]);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);

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
     * Build API payload from form data
     */
    const buildPayload = useCallback(() => {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        const sourcesArray = formData.sources.split(',').map(s => s.trim()).filter(Boolean);

        return {
            headline: formData.headline,
            subheadline: formData.subheadline,
            section: formData.section,
            contentType: formData.contentType,
            body: formData.body,
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
     */
    const fetchArticles = useCallback(async (filter?: string) => {
        setIsLoadingArticles(true);
        try {
            const url = filter ? `/api/publish/articles?filter=${filter}` : '/api/publish/articles';
            const response = await fetch(url);
            const result: ApiResponse = await response.json();

            if (result.success && result.data?.articles) {
                setArticles(result.data.articles as ArticleEntry[]);
            } else {
                showErrorFromCode(ErrorCodes.SERVER_INTERNAL_ERROR);
            }
        } catch (error) {
            logger.error('Fetch articles failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        } finally {
            setIsLoadingArticles(false);
        }
    }, [showErrorFromCode]);

    /**
     * Load articles when switching to database mode
     */
    useEffect(() => {
        if (mode !== 'editor') {
            const filter = mode === 'drafts' ? 'drafts' : mode === 'published' ? 'published' : undefined;
            fetchArticles(filter);
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
    const handleSaveDraft = useCallback(async () => {
        setIsSaving(true);
        setFieldErrors({});

        try {
            const payload = buildPayload();
            const response = await fetch('/api/publish/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result: ApiResponse = await response.json();

            if (result.success && result.data?.draftId) {
                setFormData(prev => ({ ...prev, draftId: result.data!.draftId! }));
                showSuccessFromCode(SuccessCodes.DRAFT_SAVED);
            } else if (!result.success && result.errors?.length) {
                setFieldErrors(parseFieldErrors(result.errors));
                // Get first error and show as toast with editorial message
                const firstError = getFirstError(transformApiErrors(result.errors));
                if (firstError) {
                    showToast('error', firstError.message);
                }
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
            }
        } catch (error) {
            logger.error('Draft save failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        } finally {
            setIsSaving(false);
        }
    }, [buildPayload, parseFieldErrors, showToast, showSuccessFromCode, showErrorFromCode]);

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

            const result: ApiResponse = await response.json();

            if (result.success) {
                setFormData(INITIAL_FORM_DATA);
                setShowPreview(false);
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
        if (!canPublish(formData)) {
            showToast('warning', 'Complete required fields to publish.');
            return;
        }
        setShowConfirmDialog(true);
    }, [formData, showToast]);

    /**
     * Logout
     */
    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/newsroom';
        } catch (error) {
            logger.error('Logout failed', error);
        }
    }, []);

    /**
     * Edit article (from database view)
     */
    const handleEdit = useCallback((article: ArticleEntry) => {
        const a = article as any;
        // Map article data to form data
        // API returns tags/sources as arrays, form expects comma-separated strings
        const tags = Array.isArray(a.tags) ? (a.tags as string[]).join(', ') : '';
        const sources = Array.isArray(a.sources) ? (a.sources as string[]).join(', ') : '';

        setFormData({
            headline: a.headline,
            subheadline: a.subheadline,
            section: a.section,
            contentType: a.contentType,
            body: a.body || '',
            tags,
            sources,
            placement: a.placement || 'standard',
            thumbnail: a.thumbnail || '',
            draftId: a.type === 'draft' ? a.id : undefined,
            status: a.type === 'published' ? 'published' : 'draft',
            slug: a.slug,
        });
        setFieldErrors({});
        setShowPreview(false);
        setMode('editor');
    }, []);

    /**
     * Duplicate article
     */
    const handleDuplicate = useCallback(async (article: ArticleEntry) => {
        const a = article as any;
        try {
            const response = await fetch('/api/publish/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: a.id,
                    type: a.type, // API returns 'type', use that
                    section: a.section,
                    slug: a.slug,
                }),
            });

            const result: ApiResponse = await response.json();

            if (result.success) {
                showToast('success', `Created a copy of "${result.data?.headline}"`);
                // Refresh articles list
                const filter = mode === 'drafts' ? 'drafts' : mode === 'published' ? 'published' : undefined;
                fetchArticles(filter);
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
            }
        } catch (error) {
            logger.error('Duplicate failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        }
    }, [mode, fetchArticles, showToast, showErrorFromCode]);

    /**
     * Remove Placement
     */
    const handleRemovePlacement = useCallback(async (article: ArticleEntry) => {
        const a = article as any;
        // Use headline/title for confirmation
        const title = a.headline || a.title || 'Untitled';
        const placement = a.placement || 'standard';

        if (!confirm(`Remove "${title}" from ${placement === 'lead' ? 'Lead Story' : 'Top Story'}?`)) {
            return;
        }

        try {
            // Reconstruct payload from flat article data
            const payload = {
                headline: a.headline,
                subheadline: a.subheadline,
                section: a.section,
                contentType: a.contentType,
                body: a.body || '',
                tags: a.tags || [],
                sources: a.sources || [],
                placement: 'standard',
                draftId: a.type === 'draft' ? a.id : undefined,
                status: a.type === 'published' ? 'published' : 'draft',
                slug: a.slug,
            };

            const endpoint = a.type === 'published' ? '/api/publish' : '/api/publish/draft';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result: ApiResponse = await response.json();

            if (result.success) {
                showToast('success', 'Placement updated');
                const filter = mode === 'drafts' ? 'drafts' : mode === 'published' ? 'published' : undefined;
                fetchArticles(filter);
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_SAVE_FAILED);
            }
        } catch (error) {
            logger.error('Remove placement failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        }
    }, [mode, fetchArticles, showToast, showErrorFromCode]);

    /**
     * Delete article
     */
    const handleDelete = useCallback(async (article: ArticleEntry) => {
        const a = article as any;
        try {
            const response = await fetch('/api/publish/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: a.id,
                    type: a.type,
                    section: a.section,
                    slug: a.slug,
                }),
            });

            const result: ApiResponse = await response.json();

            if (result.success) {
                showSuccessFromCode(SuccessCodes.ARTICLE_DELETED);
                // Refresh articles list
                const filter = mode === 'drafts' ? 'drafts' : mode === 'published' ? 'published' : undefined;
                fetchArticles(filter);
            } else {
                showErrorFromCode(ErrorCodes.CONTENT_DELETE_FAILED);
            }
        } catch (error) {
            logger.error('Delete failed', error);
            showErrorFromCode(ErrorCodes.NETWORK_REQUEST_FAILED);
        }
    }, [mode, fetchArticles, showSuccessFromCode, showErrorFromCode]);

    /**
     * Close preview
     */
    const handleClosePreview = useCallback(() => {
        setShowPreview(false);
    }, []);

    return (
        <div className={`${styles.page} ${isMobile ? styles.mobile : ''}`}>
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
                onLogout={handleLogout}
                isSaving={isSaving}
                isPreviewLoading={isPreviewLoading}
                isPublishing={isPublishing}
                canPublish={canPublish(formData)}
                draftId={formData.draftId}
                isMobile={isMobile}
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
                        isMobile={isMobile}
                    />
                ) : (
                    <ArticleDatabase
                        articles={articles}
                        mode={mode}
                        isLoading={isLoadingArticles}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onRemovePlacement={handleRemovePlacement}
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
