'use client';

/**
 * Editorial Toolbar
 * Persistent navigation and action bar for the publishing console
 * 
 * Left group: Navigation tabs (New Article, All Articles)
 * Right group: Actions (Save Draft, Preview, Publish, Logout)
 */

import { WorkspaceMode } from '../types';
import styles from './EditorialToolbar.module.css';

interface EditorialToolbarProps {
    /** Current workspace mode */
    mode: WorkspaceMode;
    /** Handler for mode changes */
    onModeChange: (mode: WorkspaceMode) => void;
    /** Handler for new article */
    onNewArticle: () => void;
    /** Handler for save draft */
    onSaveDraft: () => void;
    /** Handler for preview */
    onPreview: () => void;
    /** Handler for publish */
    onPublish: () => void;
    /** Handler for logout */
    onLogout: () => void;
    /** Whether save is in progress */
    isSaving: boolean;
    /** Whether preview is loading */
    isPreviewLoading: boolean;
    /** Whether publish is in progress */
    isPublishing: boolean;
    /** Current draft ID if editing */
    draftId: string | null;
    /** Whether in mobile viewport */
    isMobile?: boolean;
}

export function EditorialToolbar({
    mode,
    onModeChange,
    onNewArticle,
    onSaveDraft,
    onPreview,
    onPublish,
    onLogout,
    isSaving,
    isPreviewLoading,
    isPublishing,
    draftId,
    isMobile = false,
}: EditorialToolbarProps) {
    const isEditorMode = mode === 'editor';

    return (
        <div className={`${styles.toolbar} ${isMobile ? styles.mobile : ''}`}>
            {/* Left group: Navigation - Home + Tabs */}
            <div className={styles.navGroup}>
                {/* Home/Exit Link */}
                <a
                    href="/"
                    className={styles.homeLink}
                    title="View Public Site"
                    aria-label="View Public Site"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </a>

                <div className={styles.divider} />

                <button
                    type="button"
                    className={`${styles.navTab} ${mode === 'editor' ? styles.active : ''}`}
                    onClick={onNewArticle}
                >
                    {isMobile ? 'New' : 'New Article'}
                </button>
                <button
                    type="button"
                    className={`${styles.navTab} ${mode === 'all' ? styles.active : ''}`}
                    onClick={() => onModeChange('all')}
                >
                    {isMobile ? 'All' : 'All Articles'}
                </button>
            </div>

            {/* Draft indicator - hidden on mobile */}
            {!isMobile && draftId && isEditorMode && (
                <span className={styles.draftIndicator}>
                    Draft: {draftId.slice(0, 12)}...
                </span>
            )}

            {/* Right group: Actions - hidden on mobile (shown in MobileActionBar) */}
            <div className={styles.actionGroup}>
                {!isMobile && isEditorMode && (
                    <>
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={onSaveDraft}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={onPreview}
                            disabled={isPreviewLoading}
                        >
                            {isPreviewLoading ? 'Preparing preview…' : 'Preview'}
                        </button>
                        <button
                            type="button"
                            className={`${styles.actionButton} ${styles.publishAction}`}
                            onClick={onPublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? 'Publishing...' : 'Publish'}
                        </button>
                    </>
                )}
                <button
                    type="button"
                    className={`${styles.actionButton} ${styles.logoutAction}`}
                    onClick={onLogout}
                    aria-label="Logout"
                >
                    {isMobile ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    ) : 'Logout'}
                </button>
            </div>
        </div>
    );
}
