/**
 * Video Block Renderer
 * Renders video blocks using FACADE PATTERN:
 * - Only static thumbnail loads initially
 * - Player loads on user click
 * - Zero performance impact until interaction
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * NO AUTOPLAY - NEVER
 */

'use client';

import { useState, useCallback } from 'react';
import type { VideoBlock, VideoProvider } from '@/lib/content/media-types';
import styles from './VideoBlock.module.css';

interface VideoBlockRendererProps {
    /** Video block data */
    block: VideoBlock;
}

export function VideoBlockRenderer({ block }: VideoBlockRendererProps) {
    const { provider, embedUrl, posterUrl, caption, title } = block;

    // State: false = showing poster, true = showing player
    const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);

    /**
     * Handle play click - load the actual player
     */
    const handlePlayClick = useCallback(() => {
        setIsPlayerLoaded(true);
    }, []);

    /**
     * Get provider display name
     */
    const getProviderName = (p: VideoProvider): string => {
        switch (p) {
            case 'youtube': return 'YouTube';
            case 'vimeo': return 'Vimeo';
            case 'cdn': return 'Video';
            default: return 'Video';
        }
    };

    /**
     * Get embed URL with autoplay for when user clicks
     */
    const getAutoplayEmbedUrl = (): string => {
        switch (provider) {
            case 'youtube':
                return `${embedUrl}?autoplay=1&rel=0`;
            case 'vimeo':
                return `${embedUrl}?autoplay=1`;
            default:
                return embedUrl;
        }
    };

    /**
     * Render YouTube fallback thumbnail if maxres fails
     */
    const handlePosterError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.target as HTMLImageElement;
        if (provider === 'youtube' && img.src.includes('maxresdefault')) {
            // Fallback to hqdefault
            img.src = img.src.replace('maxresdefault', 'hqdefault');
        }
    }, [provider]);

    return (
        <figure className={styles.figure} data-block-id={block.id}>
            <div className={styles.wrapper}>
                {!isPlayerLoaded ? (
                    // FACADE: Only poster image until user clicks
                    <button
                        type="button"
                        className={styles.facade}
                        onClick={handlePlayClick}
                        aria-label={`Play: ${title || 'video'}`}
                    >
                        {posterUrl ? (
                            <img
                                src={posterUrl}
                                alt={title || 'Video thumbnail'}
                                className={styles.poster}
                                loading="lazy"
                                onError={handlePosterError}
                            />
                        ) : (
                            <div className={styles.placeholderPoster}>
                                <span className={styles.placeholderIcon}>🎬</span>
                            </div>
                        )}

                        <div className={styles.playButtonContainer}>
                            <div className={styles.playButton}>
                                <svg
                                    className={styles.playIcon}
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>

                        <div className={styles.providerBadge}>
                            {getProviderName(provider)}
                        </div>
                    </button>
                ) : (
                    // ACTUAL PLAYER: Only loads after user clicks
                    <div className={styles.playerContainer}>
                        {provider === 'cdn' ? (
                            // Native video for CDN
                            <video
                                src={embedUrl}
                                controls
                                autoPlay
                                className={styles.nativePlayer}
                                poster={posterUrl}
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            // Iframe for YouTube/Vimeo
                            <iframe
                                src={getAutoplayEmbedUrl()}
                                className={styles.iframe}
                                title={title || 'Video player'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                )}
            </div>

            {caption && (
                <figcaption className={styles.caption}>
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
