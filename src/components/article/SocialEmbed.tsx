'use client';

/**
 * SocialEmbed Component
 *
 * Requirements Met:
 * - Lazy loaded via IntersectionObserver (improves page speed).
 * - Queries the highly-cached /api/oembed endpoint (no client-side rate limits).
 * - Safe `dangerouslySetInnerHTML` injects the stripped oEmbed content.
 * - Deduplicated, dynamic execution of official platform scripts.
 */

import { useEffect, useState, useRef } from 'react';
import { detectOEmbedPlatform, OEmbedPlatform, OEmbedResponse } from '@/lib/content/oembed';
import { kn } from '@/lib/i18n/kn';
import styles from './SocialEmbed.module.css';

interface WindowWithGlobals extends Window {
    twttr?: { widgets: { load: (el?: HTMLElement) => void } };
    instgrm?: { Embeds: { process: () => void } };
    FB?: { XFBML: { parse: (el?: HTMLElement) => void } };
}

interface SocialEmbedProps {
    url: string;
}

// ============================================================================
// SDK SCRIPT INJECTION LOGIC
// ============================================================================
/**
 * Loads the official platform SDK script on-demand and ensures exactly
 * one instance is loaded globally per platform to prevent double execution errors.
 */
function loadPlatformScript(platform: OEmbedPlatform, container: HTMLElement | null) {
    if (typeof window === 'undefined') return;

    let src = '';
    let id = '';

    switch (platform) {
        case 'x':
            src = 'https://platform.twitter.com/widgets.js';
            id = 'twitter-wjs';
            break;
        case 'instagram':
            src = 'https://www.instagram.com/embed.js';
            id = 'instagram-wjs';
            break;
        case 'facebook':
            src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
            id = 'facebook-jssdk';
            break;
        case 'tiktok':
            src = 'https://www.tiktok.com/embed.js';
            id = 'tiktok-wjs';
            break;
        case 'youtube':
        case 'linkedin':
            return;
    }

    if (!src) return;

    const checkAndInitialize = (attempts = 0) => {
        if (attempts > 50) return; // Stop after 5 seconds

        const win = window as unknown as WindowWithGlobals;
        let initialized = false;

        if (platform === 'x' && win.twttr?.widgets?.load) {
            // Re-scan DOM for twitter embeds
            win.twttr.widgets.load(container || undefined);
            initialized = true;
        } else if (platform === 'instagram' && win.instgrm?.Embeds?.process) {
            win.instgrm.Embeds.process();
            initialized = true;
        } else if (platform === 'facebook' && win.FB?.XFBML?.parse) {
            win.FB.XFBML.parse(container || undefined);
            initialized = true;
        }

        if (!initialized && platform !== 'tiktok') {
            setTimeout(() => checkAndInitialize(attempts + 1), 100);
        }
    };

    // TikTok lacks a reliable re-render window function. To rehydrate dynamic embeds, we force-reload the script.
    if (platform === 'tiktok') {
        const existingTikTok = document.getElementById(id);
        if (existingTikTok) {
            existingTikTok.remove();
        }
    } else if (document.getElementById(id)) {
        // Script already appended, might be loading or loaded. Check and parse.
        checkAndInitialize();
        return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        checkAndInitialize();
    };
    document.body.appendChild(script);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SocialEmbed({ url }: SocialEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [data, setData] = useState<OEmbedResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const platform = decodeURIComponent(url) !== 'undefined' ? detectOEmbedPlatform(url) : null;

    // 1. Lazy Loading via Intersection Observer
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Only fetch once
                }
            },
            { rootMargin: '400px 0px' } // Pre-load 400px before scroll hits it
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 2. Fetch oEmbed Payload once visible
    useEffect(() => {
        if (!isVisible || !platform) return;

        const fetchEmbed = async () => {
            try {
                const response = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch oEmbed data');
                }
                const result: OEmbedResponse = await response.json();
                setData(result);
            } catch (err: unknown) {
                console.error('[SocialEmbed]', err);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        };

        fetchEmbed();
    }, [isVisible, url, platform]);

    // 3. Inject HTML Imperatively & Trigger SDK
    // By using innerHTML imperatively instead of dangerouslySetInnerHTML,
    // we prevent React from forcefully reverting the iframe back to a blockquote
    // when the parent component (like the BlockEditor) re-renders.
    useEffect(() => {
        if (data && platform && contentRef.current) {
            // Only inject if it's different to prevent resetting active iframes
            if (!contentRef.current.hasAttribute('data-injected')) {
                contentRef.current.innerHTML = data.html;
                contentRef.current.setAttribute('data-injected', 'true');

                // Push to macro task queue so browser paints the blockquote before SDK parses
                setTimeout(() => {
                    loadPlatformScript(platform, contentRef.current);
                }, 50);
            }
        }
    }, [data, platform]);

    // ========================================================================
    // RENDERING
    // ========================================================================

    if (!platform) return null; // Invisible fallback for completely unsupported URLs

    return (
        <div ref={containerRef} className={`${styles.embedContainer} ${styles[`platform-${platform}`]}`}>

            {/* Loading Skeleton */}
            {!data && !error && (
                <div className={styles.skeleton}>
                    <div className={styles.spinner} />
                </div>
            )}

            {/* Error Fallback */}
            {error && (
                <div className={styles.fallbackBlock}>
                    <p className={styles.fallbackMsg}>{kn.embed.unavailable}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.fallbackBtn}>
                        {kn.embed.viewOriginal}
                    </a>
                </div>
            )}

            {/* Official Inject Payload - Managed Imperatively */}
            <div
                ref={contentRef}
                className={styles.htmlWrapper}
                style={{ display: data && !error ? 'block' : 'none' }}
            />
        </div>
    );
}
