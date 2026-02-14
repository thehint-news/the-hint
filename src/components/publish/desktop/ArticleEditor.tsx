'use client';

/**
 * Article Editor Component
 * Two-column layout: Writing surface (70%) + Metadata sidebar (30%)
 * 
 * Writing Surface:
 * - Headline (required)
 * - Subheadline (required)
 * - Body editor (long-form with block-based media support)
 * 
 * Sidebar:
 * - Section (required)
 * - Content Type (News | Opinion)
 * - Tags (optional, max 10)
 * - Sources (optional)
 * - Homepage Placement
 * - Status indicator
 */

import { ChangeEvent, useCallback, useState, useEffect, useRef } from 'react';
import {
    ArticleFormData,
    FieldErrors,
    PreviewData,
    SECTIONS,
    CONTENT_TYPES,
} from '../types';
import { BlockEditor } from './BlockEditor';
import Image from 'next/image';
import { ArticleBody } from '@/components/article/ArticleBody';
import styles from './ArticleEditor.module.css';


interface ArticleEditorProps {
    /** Form data */
    formData: ArticleFormData;
    /** Handler for form changes */
    onFormChange: (data: ArticleFormData) => void;
    /** Field errors from validation */
    fieldErrors: FieldErrors;
    /** Client-side hints */
    clientHints: Record<string, string>;
    /** Preview data if showing preview */
    previewData: PreviewData | null;
    /** Show preview panel */
    showPreview: boolean;
    /** Close preview panel */
    onClosePreview: () => void;
    /** Handler for going back to list */
    onBackToList: () => void;
    /** Whether in mobile viewport */
    isMobile?: boolean;
}

export function ArticleEditor({
    formData,
    onFormChange,
    fieldErrors,
    clientHints,
    previewData,
    showPreview,
    onClosePreview,
    onBackToList,
    isMobile = false,
}: ArticleEditorProps) {
    /**
     * Editor mode: 'blocks' for visual block editor, 'markdown' for raw textarea
     */
    const [editorMode, setEditorMode] = useState<'blocks' | 'markdown'>('blocks');

    /**
     * Handle input changes
     */
    // Ref to stabilize callbacks
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    /**
     * Handle input changes
     */
    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            onFormChange({ ...formDataRef.current, [name]: value });
        },
        [onFormChange]
    );

    /**
     * Handle body change from BlockEditor
     */
    const handleBodyChange = useCallback(
        (newBody: string) => {
            onFormChange({ ...formDataRef.current, body: newBody });
        },
        [onFormChange]
    );

    /**
     * Handle placement toggle
     */
    const handlePlacementChange = useCallback(
        (placement: 'lead' | 'top' | 'standard') => {
            const newPlacement = formData.placement === placement ? 'standard' : placement;
            onFormChange({ ...formData, placement: newPlacement });
        },
        [formData, onFormChange]
    );

    /**
     * Format date for display
     */
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    /**
     * Thumbnail Upload Logic
     */
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const handleThumbnailSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setThumbnailError(null);

        // Validate file type (simple check)
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!validTypes.includes(file.type)) {
            setThumbnailError('Invalid file type. Please use JPEG, PNG, WebP, or AVIF.');
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setThumbnailError('File is too large. Maximum size is 5MB.');
            return;
        }

        setIsUploadingThumbnail(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.data) {
                onFormChange({ ...formDataRef.current, thumbnail: result.data.url });
            } else {
                setThumbnailError(result.error || 'Upload failed');
            }
        } catch {
            setThumbnailError('Network error during upload');
        } finally {
            setIsUploadingThumbnail(false);
            // Reset input
            if (thumbnailInputRef.current) {
                thumbnailInputRef.current.value = '';
            }
        }
    }, [onFormChange]);

    const handleRemoveThumbnail = useCallback(() => {
        onFormChange({ ...formDataRef.current, thumbnail: '' });
    }, [onFormChange]);

    return (
        <div className={`${styles.editorLayout} ${isMobile ? styles.mobile : ''}`}>
            {/* LEFT COLUMN: WRITING CANVAS */}
            <div className={styles.writingCanvas}>
                {/* Contextual Navigation */}
                <div className={styles.contextNav}>
                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={onBackToList}
                        title="Back to Article List"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span>Back to Articles</span>
                    </button>
                </div>

                {/* Headline */}
                <div className={styles.fieldWrapper}>
                    <input
                        type="text"
                        name="headline"
                        className={`${styles.headlineInput} ${fieldErrors.headline ? styles.inputError : ''}`}
                        placeholder="Headline: Enter Article Title"
                        value={formData.headline}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                    {fieldErrors.headline && (
                        <span className={styles.fieldError}>{fieldErrors.headline}</span>
                    )}
                    {!fieldErrors.headline && clientHints.headline && (
                        <span className={styles.fieldHint}>{clientHints.headline}</span>
                    )}
                </div>

                {/* Subheadline */}
                <div className={styles.fieldWrapper}>
                    <input
                        type="text"
                        name="subheadline"
                        className={`${styles.subheadlineInput} ${fieldErrors.subheadline ? styles.inputError : ''}`}
                        placeholder="Subheadline: Enter Summary"
                        value={formData.subheadline}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                    {fieldErrors.subheadline && (
                        <span className={styles.fieldError}>{fieldErrors.subheadline}</span>
                    )}
                    {!fieldErrors.subheadline && clientHints.subheadline && (
                        <span className={styles.fieldHint}>{clientHints.subheadline}</span>
                    )}
                </div>

                {/* Body Editor */}
                <div className={styles.fieldWrapper}>
                    {/* Editor Toolbar (Modes + Thumbnail) */}
                    <div className={styles.editorToolbar}>
                        <div className={styles.editorModeToggle}>
                            <button
                                type="button"
                                className={`${styles.modeButton} ${editorMode === 'blocks' ? styles.modeActive : ''}`}
                                onClick={() => setEditorMode('blocks')}
                            >
                                Visual Editor
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeButton} ${editorMode === 'markdown' ? styles.modeActive : ''}`}
                                onClick={() => setEditorMode('markdown')}
                            >
                                Markdown
                            </button>
                        </div>

                        {/* Thumbnail Controls */}
                        <div className={styles.thumbnailControls}>
                            <input
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                onChange={handleThumbnailSelect}
                                className={styles.hiddenInput}
                                style={{ display: 'none' }}
                            />

                            {formData.thumbnail ? (
                                <div className={styles.thumbnailStatus}>
                                    <span className={styles.statusIcon}>✓</span>
                                    <span className={styles.statusText}>Thumbnail Set</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveThumbnail}
                                        className={styles.removeThumbnailText}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                    disabled={isUploadingThumbnail}
                                    className={styles.uploadButtonSimple}
                                >
                                    {isUploadingThumbnail ? (
                                        <span className={styles.uploadLoader}>•••</span>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <span>Add Thumbnail</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {thumbnailError && (
                                <span className={styles.toolbarError}>{thumbnailError}</span>
                            )}
                        </div>
                    </div>

                    {/* Block-based Editor */}
                    {editorMode === 'blocks' && (
                        <BlockEditor
                            value={formData.body}
                            onChange={handleBodyChange}
                            error={fieldErrors.body}
                            placeholder="Start writing your article..."
                        />
                    )}

                    {/* Markdown Textarea (fallback) */}
                    {editorMode === 'markdown' && (
                        <>
                            <textarea
                                name="body"
                                className={`${styles.bodyEditor} ${fieldErrors.body ? styles.inputError : ''}`}
                                placeholder="Write in markdown format...

:::image
src: /media/images/photo.webp
alt: Description text
width: 1200
height: 800
:::

:::video
originalUrl: https://youtube.com/watch?v=...
caption: Description of video
posterThumbnail: https://path/to/image.jpg
:::"
                                value={formData.body}
                                onChange={handleInputChange}
                            />
                            {fieldErrors.body && (
                                <span className={styles.fieldError}>{fieldErrors.body}</span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: SIDEBAR - Metadata or Preview (Preview works on mobile as modal) */}
            {(!isMobile || showPreview) && (
                <div className={`${styles.sidebar} ${isMobile && showPreview ? styles.mobilePreview : ''}`}>
                    {/* Preview Panel */}
                    {showPreview && previewData && (
                        <div className={styles.previewPanel}>
                            <div className={styles.panelHeader}>
                                <span className={styles.panelTitle}>Preview</span>
                                <button type="button" className={styles.closeButton} onClick={onClosePreview}>×</button>
                            </div>
                            <div className={styles.previewContent}>
                                {formData.thumbnail && (
                                    <div className={styles.previewHeroImage}>
                                        <Image
                                            src={formData.thumbnail}
                                            alt="Article thumbnail"
                                            fill
                                            sizes="(max-width: 400px) 100vw, 400px"
                                            className={styles.previewImageFull}
                                        />
                                    </div>
                                )}
                                <div className={styles.previewSection}>{previewData.section.toUpperCase()}</div>
                                <h1 className={styles.previewHeadline}>{previewData.headline}</h1>
                                {previewData.subheadline && (
                                    <p className={styles.previewSubheadline}>{previewData.subheadline}</p>
                                )}
                                <div className={styles.previewMeta}>
                                    <span className={styles.previewType}>{previewData.contentType}</span>
                                    {previewData.placement === 'lead' && <span className={styles.previewFeatured}>Lead Story</span>}
                                    {previewData.placement === 'top' && <span className={styles.previewFeatured}>Top Story</span>}
                                </div>
                                <div className={styles.previewBody}>
                                    <ArticleBody content={previewData.body} />
                                </div>
                                {previewData.tags.length > 0 && (
                                    <div className={styles.previewTags}>
                                        {previewData.tags.map(tag => (
                                            <span key={tag} className={styles.previewTag}>{tag}</span>
                                        ))}
                                    </div>
                                )}
                                {previewData.sources.length > 0 && (
                                    <div className={styles.previewSources}>
                                        <strong>Sources:</strong>
                                        <ul>
                                            {previewData.sources.map((source, i) => (
                                                <li key={i}>{source}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Controls - hidden when preview is open */}
                    {!showPreview && (
                        <>
                            {/* Section */}
                            <div className={styles.controlGroup}>
                                <label className={styles.label}>Section <span className={styles.required}>*</span></label>
                                <select
                                    name="section"
                                    value={formData.section}
                                    onChange={handleInputChange}
                                    className={`${styles.select} ${fieldErrors.section ? styles.inputError : ''}`}
                                >
                                    {SECTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                {fieldErrors.section && (
                                    <span className={styles.fieldError}>{fieldErrors.section}</span>
                                )}
                            </div>

                            {/* Content Type */}
                            <div className={styles.controlGroup}>
                                <label className={styles.label}>Content Type <span className={styles.required}>*</span></label>
                                <select
                                    name="contentType"
                                    value={formData.contentType}
                                    onChange={handleInputChange}
                                    className={`${styles.select} ${fieldErrors.contentType ? styles.inputError : ''}`}
                                >
                                    {CONTENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                {fieldErrors.contentType && (
                                    <span className={styles.fieldError}>{fieldErrors.contentType}</span>
                                )}
                                {!fieldErrors.contentType && clientHints.contentType && (
                                    <span className={styles.fieldWarning}>⚠ {clientHints.contentType}</span>
                                )}
                            </div>

                            {/* Tags */}
                            <div className={styles.controlGroup}>
                                <label className={styles.label}>
                                    Tags <span className={styles.optional}>(optional, max 10)</span>
                                </label>
                                <input
                                    type="text"
                                    name="tags"
                                    className={`${styles.input} ${fieldErrors.tags ? styles.inputError : ''}`}
                                    placeholder="Add tags, separated by commas..."
                                    value={formData.tags}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.tags && (
                                    <span className={styles.fieldError}>{fieldErrors.tags}</span>
                                )}
                            </div>

                            {/* Sources */}
                            <div className={styles.controlGroup}>
                                <label className={styles.label}>
                                    Sources <span className={styles.optional}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    name="sources"
                                    className={`${styles.input} ${fieldErrors.sources ? styles.inputError : ''}`}
                                    placeholder="Add sources, separated by commas..."
                                    value={formData.sources}
                                    onChange={handleInputChange}
                                />
                                {fieldErrors.sources && (
                                    <span className={styles.fieldError}>{fieldErrors.sources}</span>
                                )}
                            </div>

                            {/* Homepage Placement */}
                            <div className={styles.controlGroup}>
                                <label className={styles.label}>Homepage Placement</label>
                                <div className={styles.placementGrid}>
                                    <button
                                        type="button"
                                        onClick={() => handlePlacementChange('lead')}
                                        className={`${styles.placementOption} ${formData.placement === 'lead' ? styles.placementActive : ''}`}
                                    >
                                        <div className={styles.placementTitle}>Lead Story</div>
                                        <div className={styles.placementDesc}>Main hero story</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePlacementChange('top')}
                                        className={`${styles.placementOption} ${formData.placement === 'top' ? styles.placementActive : ''}`}
                                    >
                                        <div className={styles.placementTitle}>Top Story</div>
                                        <div className={styles.placementDesc}>Secondary lead</div>
                                    </button>
                                </div>
                                <div className={styles.placementHint}>
                                    ℹ {formData.placement === 'standard'
                                        ? 'Article will appear in its section normally.'
                                        : `Selected: ${formData.placement === 'lead' ? 'Lead Story' : 'Top Story'}. Click to deselect.`}
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className={styles.statusSection}>
                                <div className={styles.statusLabel}>
                                    Status: <span className={formData.status === 'published' ? styles.statusPublished : styles.statusDraft}>
                                        {formData.status === 'published' ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                {formData.publishedAt && (
                                    <div className={styles.statusDate}>
                                        Published: {formatDate(formData.publishedAt)}
                                    </div>
                                )}
                                {formData.lastEdited && (
                                    <div className={styles.statusDate}>
                                        Last edited: {formatDate(formData.lastEdited)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
