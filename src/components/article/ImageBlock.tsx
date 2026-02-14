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
import Image from 'next/image';
import styles from './ImageBlock.module.css';

interface ImageBlockRendererProps {
    /** Image block data */
    block: ImageBlock;
    /** Whether image is above the fold (use eager loading) */
    isAboveFold?: boolean;
}

export function ImageBlockRenderer({ block, isAboveFold = false }: ImageBlockRendererProps) {
    const { src, alt, caption, credit, width, height } = block;

    // Build sizes attribute for responsive behavior
    const sizes = '(max-width: 600px) 100vw, (max-width: 1000px) 80vw, 1200px';

    return (
        <figure className={styles.figure} data-block-id={block.id}>
            <div className={styles.imageWrapper}>
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    priority={isAboveFold}
                    sizes={sizes}
                    className={styles.image}
                />
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
