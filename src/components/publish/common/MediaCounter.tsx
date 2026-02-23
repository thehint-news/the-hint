/**
 * Media Counter Component
 * Displays current media usage relative to limits
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 */

'use client';

import { MEDIA_LIMITS } from '@/lib/content/media-types';
import type { MediaSummary } from '@/lib/content/media-types';
import styles from './MediaCounter.module.css';

interface MediaCounterProps {
    /** Current media summary */
    summary: MediaSummary;
}

export function MediaCounter({ summary }: MediaCounterProps) {
    const { mediaCount, postCount } = summary;
    const { MAX_MEDIA, MAX_POSTS } = MEDIA_LIMITS;

    const mediaAtLimit = mediaCount >= MAX_MEDIA;
    const postAtLimit = postCount >= MAX_POSTS;

    return (
        <div className={styles.counter}>
            <div className={styles.counterGroup}>
                <span
                    className={`${styles.counterItem} ${mediaAtLimit ? styles.atLimit : ''}`}
                    title={mediaAtLimit ? 'Media limit reached' : `${MAX_MEDIA - mediaCount} media slots remaining`}
                >
                    <span className={styles.icon}>📷</span>
                    <span className={styles.count}>
                        {mediaCount}/{MAX_MEDIA}
                    </span>
                    <span className={styles.counterLabel}>media</span>
                    {mediaAtLimit && <span className={styles.limitBadge}>limit</span>}
                </span>
            </div>

            <span className={styles.separator}>•</span>

            <div className={styles.counterGroup}>
                <span
                    className={`${styles.counterItem} ${postAtLimit ? styles.atSoftLimit : ''}`}
                    title={postAtLimit ? 'Post embed limit reached' : `${MAX_POSTS - postCount} post slot available`}
                >
                    <span className={styles.icon}>🔗</span>
                    <span className={styles.count}>
                        {postCount}/{MAX_POSTS}
                    </span>
                    <span className={styles.counterLabel}>post</span>
                    {postAtLimit && postCount > 0 && (
                        <span className={styles.limitBadge}>limit</span>
                    )}
                </span>
            </div>
        </div>
    );
}
