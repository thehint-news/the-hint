/**
 * Video Block Editor Modal
 * Modal for adding and configuring video blocks
 * 
 * DESIGN SPEC: Extended Video Support
 * 
 * Features:
 * - URL paste & auto-detection
 * - 1 Video Limit Enforcement
 * - Required Metadata (Caption, Credit)
 * - Custom Thumbnail Support
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import type { VideoBlock, VideoSourceType, SocialVideoProvider } from '@/lib/content/media-types';
import { MEDIA_LIMITS } from '@/lib/content/media-types';
import styles from './VideoBlockEditor.module.css';

interface VideoBlockEditorProps {
    /** Block being edited (null for new block) */
    block: VideoBlock | null;
    /** Current video count in article */
    currentVideoCount: number;
    /** Callback when save is clicked */
    onSave: (data: {
        sourceType: VideoSourceType;
        originalUrl: string;
        embedUrl?: string;
        posterThumbnail: string;
        caption: string;
        credit?: string;
        title?: string;
        duration?: number;
        provider?: SocialVideoProvider;
        mimeType?: string;
        trustedSourceHtml?: string;
        isRestricted?: boolean;
    }) => void;
    /** Callback when cancel is clicked */
    onCancel: () => void;
}

export function VideoBlockEditor({
    block,
    currentVideoCount,
    onSave,
    onCancel
}: VideoBlockEditorProps) {
    // Basic Form State
    const [url, setUrl] = useState(block?.originalUrl || '');
    const [caption, setCaption] = useState(block?.caption || '');
    const [credit, setCredit] = useState(block?.credit || '');
    const [customThumbnail, setCustomThumbnail] = useState(block?.posterThumbnail || '');

    // Video Metadata State
    const [videoData, setVideoData] = useState<{
        sourceType: VideoSourceType;
        originalUrl: string;
        embedUrl?: string;
        posterThumbnail: string;
        title?: string;
        duration?: number;
        provider?: SocialVideoProvider;
        mimeType?: string;
        trustedSourceHtml?: string;
        isRestricted?: boolean;
    } | null>(block ? {
        sourceType: block.sourceType,
        originalUrl: block.originalUrl,
        embedUrl: block.embedUrl,
        posterThumbnail: block.posterThumbnail,
        title: block.title,
        duration: block.duration,
        provider: block.provider,
        mimeType: block.mimeType,
        trustedSourceHtml: block.trustedSourceHtml,
        isRestricted: block.isRestricted,
    } : null);

    // UX State
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    // Thumbnail Upload State
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);

    // Limit Check (Hard Limit: 1)
    const canAddVideo = block || currentVideoCount < MEDIA_LIMITS.MAX_VIDEOS;

    /**
     * Handle Thumbnail Upload
     */
    const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setThumbnailError(null);
        setIsUploadingThumbnail(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('watermark', 'true'); // Required for article body media (posters)

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setCustomThumbnail(result.data.url);
                } else {
                    setThumbnailError(result.error || 'Upload failed');
                }
            } else {
                const errorText = await response.text().catch(() => 'Upload failed');
                setThumbnailError(`Server error (${response.status}): ${errorText.slice(0, 100)}`);
            }
        } catch {
            setThumbnailError('Network error during upload');
        } finally {
            setIsUploadingThumbnail(false);
        }
    }, []);

    /**
     * Fetch video info from URL
     */
    const handleFetchVideo = useCallback(async () => {
        if (!url.trim()) {
            setFetchError('Please enter a video URL');
            return;
        }

        setFetchError(null);
        setIsFetching(true);

        try {
            const response = await fetch('/api/media/video-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            const result = await response.json();

            if (result.success && result.data) {
                setVideoData({
                    sourceType: result.data.sourceType,
                    originalUrl: result.data.originalUrl,
                    embedUrl: result.data.embedUrl,
                    posterThumbnail: result.data.posterThumbnail,
                    title: result.data.title,
                    duration: result.data.duration,
                    provider: result.data.provider,
                    mimeType: result.data.mimeType,
                    trustedSourceHtml: result.data.trustedSourceHtml,
                    isRestricted: result.data.isRestricted,
                });

                // Build default caption if empty (preserving user-typed content)
                if (!caption && result.data.title && result.data.title !== 'Video') {
                    setCaption(result.data.title);
                }

                // Build credit if author name available
                if (!credit && result.data.authorName) {
                    setCredit(result.data.authorName);
                }

                // If no poster returned (common for direct files), clear it or keep current
                if (result.data.posterThumbnail) {
                    setCustomThumbnail(result.data.posterThumbnail);
                } else {
                    setCustomThumbnail('');
                }

            } else {
                setFetchError(result.error || 'Failed to fetch video info');
                setVideoData(null);
            }
        } catch {
            setFetchError('Network error while processing video');
        } finally {
            setIsFetching(false);
        }
    }, [url, caption, credit]);

    /**
     * Handle save
     */
    const handleSave = useCallback(() => {
        setTouched(true);

        if (!videoData) return;

        // Validation
        if (!caption.trim()) {
            return; // Caption required
        }

        // Thumbnail validation (Required for file/cdn, optional for social)
        const finalThumbnail = customThumbnail.trim() || videoData.posterThumbnail;
        if (!finalThumbnail && (videoData.sourceType !== 'social' || videoData.isRestricted)) {
            return;
        }

        onSave({
            sourceType: videoData.sourceType,
            originalUrl: videoData.originalUrl,
            embedUrl: videoData.embedUrl,
            posterThumbnail: finalThumbnail,
            caption: caption.trim(),
            credit: credit.trim() || undefined,
            title: videoData.title,
            duration: videoData.duration,
            provider: videoData.provider,
            mimeType: videoData.mimeType,
            trustedSourceHtml: videoData.trustedSourceHtml,
            isRestricted: videoData.isRestricted,
        });
    }, [videoData, caption, credit, customThumbnail, onSave]);

    /**
     * Reset
     */
    const handleClear = useCallback(() => {
        setVideoData(null);
        setUrl('');
        setFetchError(null);
        setCustomThumbnail('');
        setCaption('');
        setCredit('');
        setTouched(false);
    }, []);

    const formatDuration = (seconds?: number): string => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // If limits exceeded and not editing
    if (!canAddVideo) {
        return (
            <div className={styles.overlay} onClick={onCancel}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Video Limit Reached</h3>
                        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">×</button>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.limitMessage}>
                            <span className={styles.limitIcon}>🎬</span>
                            <p>This article already has a video. Only one video is allowed.</p>
                        </div>
                    </div>
                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelButton} onClick={onCancel}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const isEditing = !!block;
    const hasThumbnail = !!(customThumbnail || videoData?.posterThumbnail);
    // Valid if: (Data exists) AND (Caption exists) AND (Thumbnail exists OR (No thumbnail BUT it is social))
    const valid = !!videoData && !!caption.trim() && (hasThumbnail || (videoData?.sourceType === 'social'));

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {isEditing ? 'Edit Video' : 'Add Video'}
                    </h3>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onCancel}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    {/* STEP 1: URL Input (if no data) */}
                    {!videoData ? (
                        <div className={styles.urlInputSection}>
                            <label className={styles.label}>Video URL</label>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste URL (YouTube, Vimeo, Twitter, direct .mp4, etc.)"
                                    className={styles.input}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFetchVideo()}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className={styles.fetchButton}
                                    onClick={(e) => { e.stopPropagation(); handleFetchVideo(); }}
                                    disabled={isFetching || !url.trim()}
                                >
                                    {isFetching ? 'Checking...' : 'Add'}
                                </button>
                            </div>
                            {fetchError && <div className={styles.error}>{fetchError}</div>}
                            <div className={styles.supportedHint}>
                                Supports: YouTube, Vimeo, X (Twitter), Instagram, Facebook, TikTok, LinkedIn, and direct video files (.mp4, .webm).
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: Preview & Metadata */
                        <div className={styles.previewSection}>

                            {/* Editorial Warning for Restricted Platforms */}
                            {videoData.isRestricted && (
                                <div className={styles.restrictedWarning}>
                                    <span className={styles.warningIcon}>ℹ️</span>
                                    <p className={styles.warningText}>
                                        This platform restricts external playback.
                                    </p>
                                </div>
                            )}

                            {/* Preview Card */}
                            <div className={styles.previewCard}>
                                <div className={styles.thumbnailContainer}>
                                    {hasThumbnail ? (
                                        <Image
                                            src={customThumbnail || videoData.posterThumbnail}
                                            alt="Preview"
                                            fill
                                            sizes="160px"
                                            className={styles.thumbnailImage}
                                        />
                                    ) : (
                                        <div className={styles.missingThumbnail}>
                                            <span style={{ fontSize: '24px' }}>🎬</span>
                                            <span style={{ fontSize: '12px', marginTop: '4px' }}>Link Preview</span>
                                        </div>
                                    )}
                                    {videoData.duration && (
                                        <span className={styles.durationBadge}>
                                            {formatDuration(videoData.duration)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.previewInfo}>
                                    <div className={styles.providerBadge}>
                                        {videoData.provider || videoData.sourceType}
                                    </div>
                                    <h4 className={styles.previewTitle}>
                                        {videoData.title || 'Untitled Video'}
                                    </h4>
                                    <div className={styles.previewActions}>
                                        <button
                                            type="button"
                                            className={styles.changeButton}
                                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                        >
                                            Replace Video
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.fetchMetadataButton}
                                            onClick={(e) => { e.stopPropagation(); handleFetchVideo(); }}
                                            disabled={isFetching}
                                            title="Auto-fetch thumbnail and title from platform"
                                        >
                                            {isFetching ? 'Fetching...' : 'Fetch Metadata'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Thumbnail Overlay Input (Optional Override) */}
                            {(!hasThumbnail || videoData.sourceType !== 'social' || videoData.isRestricted) && (
                                <div className={styles.field}>
                                    <label className={styles.label}>
                                        {videoData.sourceType === 'social' ? 'Poster Thumbnail' : 'Poster Thumbnail'}
                                        {(!hasThumbnail && (videoData.sourceType !== 'social' || videoData.isRestricted)) && <span className={styles.required}>* Required</span>}
                                        {(videoData.sourceType === 'social' && !videoData.isRestricted) && <span className={styles.optional}>(Optional)</span>}
                                    </label>

                                    <div className={styles.thumbnailUpload}>
                                        <div
                                            className={styles.thumbnailDropzone}
                                            onClick={(e) => { e.stopPropagation(); document.getElementById('thumbnail-upload')?.click(); }}
                                        >
                                            <span className={styles.dropicon}>🖼️</span>
                                            <span className={styles.droptext}>
                                                {isUploadingThumbnail ? 'Uploading...' : 'Click to upload poster thumbnail'}
                                            </span>
                                        </div>
                                        <input
                                            id="thumbnail-upload"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/avif"
                                            className={styles.hiddenInput}
                                            onChange={handleThumbnailUpload}
                                            disabled={isUploadingThumbnail}
                                        />
                                    </div>

                                    {!hasThumbnail && (videoData.sourceType !== 'social' || videoData.isRestricted) && (
                                        <p className={styles.fieldHint}>
                                            This video requires a poster thumbnail for the link preview. Please upload one.
                                        </p>
                                    )}
                                    {thumbnailError && <div className={styles.error}>{thumbnailError}</div>}
                                </div>
                            )}

                            {/* Caption Input */}
                            <div className={styles.field}>
                                <label className={styles.label}>
                                    Caption <span className={styles.required}>* Required</span>
                                </label>
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Describe this video for readers..."
                                    className={`${styles.captionTextarea} ${(touched && !caption.trim()) ? styles.inputError : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                    rows={3}
                                />
                            </div>

                            {/* Credit Input */}
                            <div className={styles.field}>
                                <label className={styles.label}>
                                    Source / Credit <span className={styles.optional}>(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={credit}
                                    onChange={(e) => setCredit(e.target.value)}
                                    placeholder="e.g. Courtesy of NASA"
                                    className={styles.input}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.saveButton}
                        onClick={(e) => { e.stopPropagation(); handleSave(); }}
                        disabled={!valid}
                    >
                        {isEditing ? 'Save Changes' : 'Insert Video'}
                    </button>
                </div>

            </div>
        </div>
    );
}
