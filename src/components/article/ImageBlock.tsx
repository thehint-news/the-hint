/**
 * Image Block Renderer
 * Renders image blocks in published articles with:
 * - Responsive images (srcset)
 * - Lazy loading (native)
 * - Explicit dimensions (prevents CLS)
 * - Accessible alt text
 * - Caption and credit display
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 */

import type { ImageBlock } from '@/lib/content/media-types';
import styles from './ImageBlock.module.css';

interface ImageBlockRendererProps {
    /** Image block data */
    block: ImageBlock;
    /** Whether image is above the fold (use eager loading) */
    isAboveFold?: boolean;
}

export function ImageBlockRenderer({ block, isAboveFold = false }: ImageBlockRendererProps) {
    const { src, alt, caption, credit, width, height, srcset } = block;

    // Determine loading strategy
    const loading = isAboveFold ? 'eager' : 'lazy';
    const decoding = isAboveFold ? 'sync' : 'async';

    // Build sizes attribute for responsive behavior
    const sizes = '(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px';

    return (
        <figure className={styles.figure} data-block-id={block.id}>
            <div className={styles.imageWrapper}>
                <picture>
                    {srcset && (
                        <source
                            srcSet={srcset}
                            sizes={sizes}
                            type="image/webp"
                        />
                    )}
                    <img
                        src={src}
                        alt={alt}
                        width={width}
                        height={height}
                        loading={loading}
                        decoding={decoding}
                        className={styles.image}
                    />
                </picture>
            </div>

            {(caption || credit) && (
                <figcaption className={styles.caption}>
                    {caption && (
                        <span className={styles.captionText}>{caption}</span>
                    )}
                    {credit && (
                        <span className={styles.credit}>{credit}</span>
                    )}
                </figcaption>
            )}
        </figure>
    );
}
