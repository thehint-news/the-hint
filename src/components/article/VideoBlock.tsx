/**
 * Video Block Renderer
 * Renders video blocks using FACADE PATTERN:
 * - Only static thumbnail loads initially
 * - Player loads on user click
 * - Zero performance impact until interaction
 * 
 * DESIGN SPEC: Extended Video Support
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Script from 'next/script';
import type { VideoBlock } from '@/lib/content/media-types';
import styles from './VideoBlock.module.css';

interface VideoBlockRendererProps {
    /** Video block data */
    block: VideoBlock;
}

export function VideoBlockRenderer({ block }: VideoBlockRendererProps) {
    const {
        sourceType,
        provider,
        embedUrl,
        originalUrl,
        posterThumbnail,
        caption,
        title,
        credit,
        trustedSourceHtml
    } = block as any; // Cast for renaming migration

    // State: false = showing poster, true = showing player
    const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);

    /**
     * Re-initialize social widgets when content changes
     */
    useEffect(() => {
        // Twitter / X
        if (trustedSourceHtml && (provider === 'twitter' || provider === 'x')) {
            // @ts-ignore
            if (window.twttr && window.twttr.widgets) {
                // @ts-ignore
                window.twttr.widgets.load();
            }
        }
        // Instagram
        if (trustedSourceHtml && provider === 'instagram') {
            // @ts-ignore
            if (window.instgrm && window.instgrm.Embeds) {
                // @ts-ignore
                window.instgrm.Embeds.process();
            }
        }
    }, [trustedSourceHtml, provider]);

    /**
     * Handle play click - load the actual player
     */
    const handlePlayClick = useCallback(() => {
        setIsPlayerLoaded(true);
    }, []);

    /**
     * Get provider display name
     */
    const getProviderName = (): string => {
        if (sourceType === 'file' || sourceType === 'cdn') return 'Video';
        if (typeof provider === 'string') {
            return provider.charAt(0).toUpperCase() + provider.slice(1); // Capitalize
        }
        return 'Video';
    };

    /**
     * Get embed URL with autoplay for when user clicks
     */
    const getAutoplayEmbedUrl = (): string => {
        if (!embedUrl) return '';
        const separator = embedUrl.includes('?') ? '&' : '?';

        switch (provider) {
            case 'youtube':
                return `${embedUrl}${separator}autoplay=1&rel=0`;
            case 'vimeo':
                return `${embedUrl}${separator}autoplay=1`;
            default:
                return embedUrl;
        }
    };

    /**
     * Render YouTube fallback thumbnail if maxres fails
     */
    const handlePosterError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.target as HTMLImageElement;
        // Only retry for YouTube maxres
        if ((provider === 'youtube') && img.src.includes('maxresdefault')) {
            img.src = img.src.replace('maxresdefault', 'hqdefault');
        }
    }, [provider]);

    // Determine if this should be rendered as a full "social post" embed or a performance-optimized "video facade"
    const isSocialPost = sourceType === 'social' && ['x', 'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'].includes(provider || '');

    // Performance logic: 
    // - DIRECT VIDEOS (YouTube, Vimeo, Files): Use facade (image + play button) for speed.
    // - SOCIAL POSTS (X, Instagram): Display the entire social context immediately.
    const shouldUseFacade = !isSocialPost && !isPlayerLoaded;

    return (
        <figure
            className={`${styles.figure} ${isSocialPost ? styles.socialFigure : ''}`}
            data-block-id={block.id}
        >
            <div className={isSocialPost ? styles.socialWrapper : styles.wrapper}>
                {shouldUseFacade ? (
                    // FACADE: Only poster or placeholder image until user clicks.
                    <button
                        type="button"
                        className={styles.facade}
                        onClick={handlePlayClick}
                        aria-label={`Play: ${title || 'video'}`}
                    >
                        {posterThumbnail ? (
                            <img
                                src={posterThumbnail}
                                alt={title || 'Video thumbnail'}
                                className={styles.poster}
                                loading="lazy"
                                onError={handlePosterError}
                            />
                        ) : (
                            <div className={styles.placeholderPoster}>
                                {block.sourceType === 'social' && (
                                    <div className={styles.platformBadge}>
                                        {block.provider || 'Social Video'}
                                    </div>
                                )}
                                <div className={styles.placeholderContent}>
                                    <span className={styles.placeholderIcon}>🎬</span>
                                </div>
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
                            {getProviderName()}
                        </div>
                    </button>
                ) : (
                    // ACTUAL PLAYER / EMBED
                    <div className={isSocialPost ? styles.socialPlayerContainer : styles.playerContainer}>
                        {isSocialPost && trustedSourceHtml ? (
                            <>
                                <div
                                    className={styles.nativeSocialEmbed}
                                    dangerouslySetInnerHTML={{ __html: trustedSourceHtml }}
                                />
                                {(provider === 'x' || provider === 'twitter') && (
                                    <Script
                                        src="https://platform.twitter.com/widgets.js"
                                        strategy="lazyOnload"
                                    />
                                )}
                                {provider === 'instagram' && (
                                    <Script
                                        src="https://www.instagram.com/embed.js"
                                        strategy="lazyOnload"
                                    />
                                )}
                            </>
                        ) : ((sourceType === 'file' || sourceType === 'cdn') && originalUrl) ? (
                            <video
                                src={originalUrl}
                                controls
                                autoPlay
                                className={styles.nativePlayer}
                                poster={posterThumbnail}
                            >
                                <a href={originalUrl} target="_blank" rel="noopener noreferrer">
                                    View video at source
                                </a>
                            </video>
                        ) : embedUrl ? (
                            <iframe
                                src={isSocialPost ? embedUrl : getAutoplayEmbedUrl()}
                                className={styles.iframe}
                                title={title || 'Social Post Content'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                                loading="lazy"
                            />
                        ) : null}
                    </div>
                )}
            </div>

            {(caption || credit) && (
                <figcaption className={styles.caption}>
                    {caption && <span className={styles.captionText}>{caption}</span>}
                    {credit && <span className={styles.credit}>{credit}</span>}
                </figcaption>
            )}
        </figure>
    );
}
