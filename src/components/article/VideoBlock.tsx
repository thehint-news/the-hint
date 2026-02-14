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
        trustedSourceHtml,
        isRestricted
    } = block;

    // State: false = showing poster, true = showing player
    const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);

    // Determines if we should use the Fallback Link Preview instead of an embed
    // Forced for Facebook/Restricted to avoid "Video Unavailable" errors.
    const useFallbackMode = isRestricted === true;

    // Determine if this should be rendered as a full "social post" embed or a performance-optimized "video facade"
    // - Social Posts (X, Instagram, LinkedIn): Immediate load, variable height.
    // - Videos (YouTube, Vimeo): Facade first, fixed 16:9 aspect ratio.
    const isSocialPost = sourceType === 'social' && !useFallbackMode && (
        ['x', 'twitter', 'instagram', 'tiktok', 'linkedin', 'facebook'].includes(provider || '')
    );

    // Performance logic: 
    // - DIRECT VIDEOS (YouTube, Vimeo, Files): Use facade (image + play button) for speed.
    // - SOCIAL POSTS (Facebook, X, Instagram): Display the entire social context immediately (or via SDK).
    const shouldUseFacade = !isSocialPost && !useFallbackMode && !isPlayerLoaded;

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
            // Facebook plugin does not support autoplay via URL param efficiently
            // and improper params can cause 'Video Unavailable'
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

    return (
        <figure
            className={`${styles.figure} ${isSocialPost ? styles.socialFigure : ''}`}
            data-block-id={block.id}
        >
            <div className={(isSocialPost || useFallbackMode) ? styles.socialWrapper : styles.wrapper}>
                {useFallbackMode ? (
                    /* FALLBACK MODE: High-fidelity link preview for restricted platforms (Facebook/Insta) */
                    <div className={styles.fallbackPreview}>
                        <div className={styles.fallbackContent}>
                            {posterThumbnail ? (
                                <img
                                    src={posterThumbnail}
                                    alt={title || 'Video preview'}
                                    className={styles.fallbackPoster}
                                    loading="lazy"
                                />
                            ) : (
                                <div className={styles.fallbackPlaceholder}>
                                    <span>🎬</span>
                                </div>
                            )}

                            {/* Branded Play Button Overlay */}
                            <div className={styles.fallbackOverlay}>
                                <div className={styles.fallbackPlayButton}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>

                            <div className={styles.fallbackBranding}>
                                {getProviderName()}
                            </div>
                        </div>

                        {/* Watch on [Platform] CTA */}
                        {originalUrl && (
                            <div className={styles.fallbackCtaContainer}>
                                <a
                                    href={originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.fallbackCta}
                                >
                                    <span>Watch on {getProviderName()}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                        )}
                    </div>
                ) : shouldUseFacade ? (
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
                        {isSocialPost ? (
                            <>
                                {/* Native Embed HTML (Twitter, Instagram, Facebook OEmbed) */}
                                {trustedSourceHtml ? (
                                    <div
                                        className={styles.nativeSocialEmbed}
                                        dangerouslySetInnerHTML={{ __html: trustedSourceHtml }}
                                    />
                                ) : (
                                    /* Logic for other social types that fallback to iframe */
                                    <iframe
                                        src={embedUrl}
                                        className={styles.iframe}
                                        title={title || 'Social Post Content'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                                        loading="lazy"
                                        // Specific styles for Facebook to match user request if needed, 
                                        // but safely handled by wrapper CSS mostly.
                                        style={provider === 'facebook' ? { border: 'none', overflow: 'hidden' } : undefined}
                                    />
                                )}

                                {/* Social SDK Scripts - ONLY for Twitter/Instagram if needed */}
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
                                {/* Facebook SDK Removed - using direct Iframe as requested */}
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
                                src={getAutoplayEmbedUrl()}
                                className={styles.iframe}
                                title={title || 'Video Content'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                                loading="lazy"
                            />
                        ) : null}
                    </div>
                )}
            </div>

            {/* External Link */}
            {originalUrl && (
                <div className={styles.exploreLinkContainer}>
                    <a
                        href={originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.exploreLink}
                    >
                        Explore now
                    </a>
                </div>
            )}

            {(caption || credit) && (
                <figcaption className={styles.caption}>
                    {caption && <span className={styles.captionText}>{caption}</span>}
                    {credit && <span className={styles.credit}>{credit}</span>}
                </figcaption>
            )}
        </figure>
    );
}
