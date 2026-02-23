/**
 * Post Block Editor Modal
 * Modal for adding social post embeds to articles
 * 
 * Features:
 * - Accept URL or embed HTML paste
 * - Platform auto-detection
 * - Server-side metadata fetch via API
 * - Preview of the post card
 * - Error handling for unsupported URLs
 * 
 * NO client-side metadata fetching.
 * NO platform SDK dependencies.
 */

'use client';

import { useState, useCallback } from 'react';
import type { PostPlatform, PostMetadata } from '@/lib/content/media-types';
import { MEDIA_LIMITS } from '@/lib/content/media-types';
import { detectPlatform } from '@/lib/content/post-utils';
import { SocialEmbed } from '@/components/article/SocialEmbed';
import styles from './PostBlockEditor.module.css';

interface PostBlockEditorProps {
    /** Current post count in the article */
    currentPostCount: number;
    /** Callback when save is clicked */
    onSave: (data: {
        originalUrl: string;
        canonicalUrl: string;
        platform: PostPlatform;
        metadata: PostMetadata;
    }) => void;
    /** Callback when cancel is clicked */
    onCancel: () => void;
}

interface FetchState {
    loading: boolean;
    error: string | null;
    data: {
        platform: PostPlatform;
        canonicalUrl: string;
        originalUrl: string;
        metadata: PostMetadata;
    } | null;
}

export function PostBlockEditor({
    currentPostCount,
    onSave,
    onCancel,
}: PostBlockEditorProps) {
    const [input, setInput] = useState('');
    const [fetchState, setFetchState] = useState<FetchState>({
        loading: false,
        error: null,
        data: null,
    });

    const isAtLimit = currentPostCount >= MEDIA_LIMITS.MAX_POSTS;

    // Detect platform from input in real-time
    const detectedPlatform = input.trim() ? detectPlatform(input) : null;

    /**
     * Fetch metadata from server
     */
    const handleFetchMetadata = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        setFetchState({ loading: true, error: null, data: null });

        try {
            // Determine if input is URL or embed HTML
            const isHtml = trimmed.startsWith('<') || trimmed.includes('<blockquote') || trimmed.includes('<iframe') || trimmed.includes('<div');
            const body = isHtml ? { embedHtml: trimmed } : { url: trimmed };

            const response = await fetch('/api/publish/post-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (!result.success) {
                setFetchState({
                    loading: false,
                    error: result.error || 'Failed to fetch post data.',
                    data: null,
                });
                return;
            }

            setFetchState({
                loading: false,
                error: null,
                data: result.data,
            });
        } catch (err) {
            console.error('[PostBlockEditor] Fetch error:', err);
            setFetchState({
                loading: false,
                error: 'Network error. Please try again.',
                data: null,
            });
        }
    }, [input]);

    /**
     * Handle save
     */
    const handleSave = useCallback(() => {
        if (!fetchState.data) return;

        onSave({
            originalUrl: fetchState.data.originalUrl,
            canonicalUrl: fetchState.data.canonicalUrl,
            platform: fetchState.data.platform,
            metadata: fetchState.data.metadata,
        });
    }, [fetchState.data, onSave]);

    /**
     * Get platform display name
     */
    const getPlatformName = (platform: PostPlatform): string => {
        const names: Record<PostPlatform, string> = {
            x: 'X (Twitter)',
            facebook: 'Facebook',
            instagram: 'Instagram',
            youtube: 'YouTube',
            linkedin: 'LinkedIn',
            tiktok: 'TikTok',
        };
        return names[platform] || platform;
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>Add Post Embed</h3>
                    <button
                        className={styles.closeButton}
                        onClick={onCancel}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Limit warning */}
                {isAtLimit && (
                    <div className={styles.limitWarning}>
                        Post embed limit reached ({currentPostCount}/{MEDIA_LIMITS.MAX_POSTS})
                    </div>
                )}

                {/* Input area */}
                <div className={styles.inputSection}>
                    <label className={styles.label}>
                        Paste a social media URL or embed HTML
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            // Clear previous fetch when input changes
                            if (fetchState.data || fetchState.error) {
                                setFetchState({ loading: false, error: null, data: null });
                            }
                        }}
                        placeholder="https://x.com/username/status/123456 or paste embed HTML..."
                        rows={4}
                        disabled={isAtLimit}
                    />

                    {/* Platform detection indicator */}
                    {detectedPlatform && (
                        <div className={styles.platformDetected}>
                            <span className={styles.platformDot} />
                            Detected: <strong>{getPlatformName(detectedPlatform)}</strong>
                        </div>
                    )}

                    {/* Fetch button */}
                    <button
                        className={styles.fetchButton}
                        onClick={handleFetchMetadata}
                        disabled={!input.trim() || !detectedPlatform || fetchState.loading || isAtLimit}
                    >
                        {fetchState.loading ? (
                            <>
                                <span className={styles.spinner} />
                                Fetching...
                            </>
                        ) : (
                            'Fetch Preview'
                        )}
                    </button>
                </div>

                {/* Error display */}
                {fetchState.error && (
                    <div className={styles.error}>
                        {fetchState.error}
                    </div>
                )}

                {/* Preview */}
                {fetchState.data && (
                    <div className={styles.previewSection}>
                        <div className={styles.previewLabel}>True Rendering Preview</div>
                        <div style={{ pointerEvents: 'none', minHeight: '150px' }}>
                            <SocialEmbed url={fetchState.data.canonicalUrl || fetchState.data.originalUrl} />
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!fetchState.data || isAtLimit}
                    >
                        Insert Post
                    </button>
                </div>

                {/* Supported platforms list */}
                <div className={styles.helpText}>
                    Supported: X, Facebook, Instagram, YouTube, LinkedIn, TikTok
                </div>
            </div>
        </div>
    );
}
