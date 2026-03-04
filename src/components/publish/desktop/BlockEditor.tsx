/**
 * Block Editor Component
 * Block-based writing surface for articles with media support
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 * 
 * ARCHITECTURE:
 * - Blocks are the SINGLE SOURCE OF TRUTH
 * - Zero content transformation between editor, storage, and rendering
 * - Enter = new block, Shift+Enter = line break inside block
 * 
 * Features:
 * - Visual block-based editing (paragraph, subheading, quote)
 * - Insert menu for adding media blocks
 * - Media counter showing limits
 */

'use client';

import { useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import Image from 'next/image';
import {
    ContentBlock,
    ContentBlockType,
    ImageBlock,
    VideoBlock,
    PostBlock,
    calculateMediaSummary,
    createParagraphBlock,
    createSubheadingBlock,
    createQuoteBlock,
    createImageBlock,
    createVideoBlock,
    createPostBlock,
    reorderBlocks,
    isImageBlock,
    isVideoBlock,
    isPostBlock,
    MEDIA_LIMITS,
    PostPlatform,
    PostMetadata,
} from '@/lib/content/media-types';
import { canInsertMediaAt } from '@/lib/validation/media';
import { MediaCounter } from '../common/MediaCounter';
import { ImageBlockEditor } from './ImageBlockEditor';
import { VideoBlockEditor } from './VideoBlockEditor';
import { PostBlockEditor } from './PostBlockEditor';
import { SocialEmbed } from '@/components/article/SocialEmbed';
import type { ImageAspectRatio, VideoSourceType, SocialVideoProvider } from '@/lib/content/media-types';
import styles from './BlockEditor.module.css';

// =============================================================================
// PROPS
// =============================================================================

interface BlockEditorProps {
    /** Current content blocks */
    blocks: ContentBlock[];
    /** Handler for block changes */
    onChange: (blocks: ContentBlock[]) => void;
    /** Field error message */
    error?: string;
    /** Placeholder text */
    placeholder?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BlockEditor({
    blocks,
    onChange,
    error,
    placeholder = 'Start writing your article...',
}: BlockEditorProps) {
    // UI State
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
    const [showInsertMenu, setShowInsertMenu] = useState(false);
    const [insertPosition, setInsertPosition] = useState<number>(0);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [showVideoEditor, setShowVideoEditor] = useState(false);
    const [showPostEditor, setShowPostEditor] = useState(false);
    const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);

    // Refs for managing focus
    const blockRefs = useRef<Map<string, HTMLTextAreaElement | HTMLDivElement>>(new Map());

    // Auto-resize textareas based on content
    const resizeAllTextareas = useCallback(() => {
        const textareas: HTMLTextAreaElement[] = [];
        blockRefs.current.forEach((el) => {
            if (el instanceof HTMLTextAreaElement) textareas.push(el);
        });

        if (textareas.length === 0) return;

        // Save scroll position
        const scrollContainer = textareas[0].closest('[class*="writingCanvas"]') || document.documentElement;
        const scrollTop = scrollContainer.scrollTop;
        const windowY = window.scrollY;

        textareas.forEach((el) => {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        });

        // Restore scroll position to prevent jumping
        scrollContainer.scrollTop = scrollTop;
        window.scrollTo(window.scrollX, windowY);
    }, []);

    useLayoutEffect(() => {
        resizeAllTextareas();

        window.addEventListener('resize', resizeAllTextareas);

        const timeoutId = setTimeout(resizeAllTextareas, 100);

        return () => {
            window.removeEventListener('resize', resizeAllTextareas);
            clearTimeout(timeoutId);
        };
    }, [blocks, resizeAllTextareas]);

    // Calculate media summary
    const mediaSummary = useMemo(() => calculateMediaSummary(blocks), [blocks]);

    // Helper to update blocks and trigger change
    const updateBlocks = useCallback((newBlocks: ContentBlock[]) => {
        onChange(newBlocks);
    }, [onChange]);


    // ==========================================================================
    // BLOCK OPERATIONS
    // ==========================================================================

    /**
     * Update a block's content
     */
    const updateBlockContent = useCallback((blockId: string, content: string) => {
        const newBlocks = blocks.map(block => {
            if (block.id === blockId && 'content' in block) {
                return { ...block, content };
            }
            return block;
        });
        updateBlocks(newBlocks);
    }, [blocks, updateBlocks]);

    /**
     * Insert a new block at position
     */
    const insertBlock = useCallback((type: ContentBlockType, position: number): string | null => {
        let newBlock: ContentBlock;

        switch (type) {
            case 'paragraph':
                newBlock = createParagraphBlock('', position);
                break;
            case 'subheading':
                newBlock = createSubheadingBlock('', position);
                break;
            case 'quote':
                newBlock = createQuoteBlock('', position);
                break;
            default:
                return null;
        }

        const updated = [...blocks];
        updated.splice(position, 0, newBlock);
        updateBlocks(reorderBlocks(updated));
        setShowInsertMenu(false);
        return newBlock.id;
    }, [blocks, updateBlocks]);

    /**
     * Delete a block
     */
    const deleteBlock = useCallback((blockId: string) => {
        const filtered = blocks.filter(b => b.id !== blockId);
        updateBlocks(reorderBlocks(filtered));
        // Simple focus fallback
        if (filtered.length > 0) {
            // If we deleted the focused block, focus the one before it, or the first one
            if (focusedBlockId === blockId) {
                // Find index found in original blocks
                // This is slightly complex without index locally, but for now we can persist focus? 
                // Actually if a block is gone, we can't focus it.
                // We'll let the user click for now to avoid jumpiness.
            }
        }
    }, [blocks, updateBlocks, focusedBlockId]);

    /**
     * Move a block up or down
     */
    const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
        const index = blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === blocks.length - 1) return;

        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

        // Relaxed validation during editing - reorder blocks (updates indices) and save
        updateBlocks(reorderBlocks(newBlocks));
    }, [blocks, updateBlocks]);

    /**
     * Handle keyboard shortcuts in blocks
     */
    const handleBlockKeyDown = useCallback((
        e: React.KeyboardEvent,
        block: ContentBlock,
        index: number
    ) => {
        // Enter = Create new paragraph block below
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const newBlockId = insertBlock('paragraph', index + 1);

            // Focus new block
            if (newBlockId) {
                // Must wait for render cycle to complete so ref is attached
                requestAnimationFrame(() => {
                    // Try to focus immediately if ref exists (might not yet)
                    const el = blockRefs.current.get(newBlockId);
                    if (el) {
                        el.focus();
                    } else {
                        // Retry once more slightly later
                        setTimeout(() => {
                            const retryEl = blockRefs.current.get(newBlockId);
                            retryEl?.focus();
                        }, 50);
                    }
                });
                setFocusedBlockId(newBlockId);
            }
            return;
        }

        // Backspace at start of empty block = delete block
        if (e.key === 'Backspace') {
            const target = e.target as HTMLTextAreaElement;
            const content = 'content' in block ? block.content : '';

            if (target.selectionStart === 0 && content === '' && blocks.length > 1) {
                e.preventDefault();
                deleteBlock(block.id);
                // Focus previous block
                if (index > 0) {
                    setFocusedBlockId(blocks[index - 1].id);
                }
            }
        }
    }, [blocks, deleteBlock, insertBlock]);

    // ==========================================================================
    // INSERT MENU
    // ==========================================================================

    /**
     * Show insert menu at position
     */
    const openInsertMenu = useCallback((position: number) => {
        setInsertPosition(position);
        setShowInsertMenu(true);
    }, []);

    /**
     * Get available insert options
     */
    const getInsertOptions = useCallback(() => {
        const mediaCount = mediaSummary.mediaCount;
        const postCount = mediaSummary.postCount;

        // Check if media can be inserted at this position
        const canInsertImage = canInsertMediaAt(blocks, insertPosition, 'image');
        const canInsertVideo = canInsertMediaAt(blocks, insertPosition, 'video');
        const canInsertPost = canInsertMediaAt(blocks, insertPosition, 'post');

        return [
            { type: 'paragraph' as ContentBlockType, label: 'Paragraph', icon: '¶', disabled: false },
            { type: 'subheading' as ContentBlockType, label: 'Subheading', icon: 'H', disabled: false },
            { type: 'quote' as ContentBlockType, label: 'Quote', icon: '❝', disabled: false },
            {
                type: 'image' as ContentBlockType,
                label: `Image (${mediaCount}/${MEDIA_LIMITS.MAX_MEDIA} media)`,
                icon: '🖼',
                disabled: !canInsertImage.valid || mediaCount >= MEDIA_LIMITS.MAX_MEDIA,
                reason: !canInsertImage.valid ? canInsertImage.reason : undefined,
            },
            {
                type: 'video' as ContentBlockType,
                label: `Video (${mediaCount}/${MEDIA_LIMITS.MAX_MEDIA} media)`,
                icon: '🎬',
                disabled: !canInsertVideo.valid || mediaCount >= MEDIA_LIMITS.MAX_MEDIA,
                reason: !canInsertVideo.valid ? canInsertVideo.reason : undefined,
            },
            {
                type: 'post' as ContentBlockType,
                label: `Post Embed (${postCount}/${MEDIA_LIMITS.MAX_POSTS})`,
                icon: '🔗',
                disabled: !canInsertPost.valid || postCount >= MEDIA_LIMITS.MAX_POSTS,
                reason: !canInsertPost.valid ? canInsertPost.reason : undefined,
            },
        ];
    }, [blocks, insertPosition, mediaSummary]);

    /**
     * Handle insert option selection
     */
    const handleInsertSelect = useCallback((type: ContentBlockType) => {
        if (type === 'image') {
            setShowInsertMenu(false);
            setEditingBlock(null);
            setShowImageEditor(true);
        } else if (type === 'video') {
            setShowInsertMenu(false);
            setEditingBlock(null);
            setShowVideoEditor(true);
        } else if (type === 'post') {
            setShowInsertMenu(false);
            setEditingBlock(null);
            setShowPostEditor(true);
        } else {
            insertBlock(type, insertPosition);
        }
    }, [insertBlock, insertPosition]);

    // ==========================================================================
    // MEDIA BLOCK HANDLERS
    // ==========================================================================

    /**
     * Handle image save from editor
     */
    const handleImageSave = useCallback((data: {
        src: string;
        alt: string;
        caption?: string;
        credit?: string;
        width: number;
        height: number;
        aspectRatio: ImageAspectRatio;
        srcset?: string;
    }) => {
        if (editingBlock && isImageBlock(editingBlock)) {
            // Update existing block
            const newBlocks = blocks.map(b => {
                if (b.id === editingBlock.id) {
                    return { ...b, ...data };
                }
                return b;
            });
            updateBlocks(newBlocks);
        } else {
            // Create new image block
            const newBlock = createImageBlock(insertPosition, data);
            const updated = [...blocks];
            updated.splice(insertPosition, 0, newBlock);
            updateBlocks(reorderBlocks(updated));
        }
        setShowImageEditor(false);
        setEditingBlock(null);
    }, [blocks, editingBlock, insertPosition, updateBlocks]);

    /**
     * Handle video save from editor
     */
    const handleVideoSave = useCallback((data: {
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
    }) => {
        if (editingBlock && isVideoBlock(editingBlock)) {
            // Update existing block
            const newBlocks = blocks.map(b => {
                if (b.id === editingBlock.id) {
                    return { ...b, ...data };
                }
                return b;
            });
            updateBlocks(newBlocks);
        } else {
            // Create new video block
            const newBlock = createVideoBlock(insertPosition, data);
            const updated = [...blocks];
            updated.splice(insertPosition, 0, newBlock);
            updateBlocks(reorderBlocks(updated));
        }
        setShowVideoEditor(false);
        setEditingBlock(null);
    }, [blocks, editingBlock, insertPosition, updateBlocks]);

    /**
     * Edit an existing media block
     */
    const handleEditMediaBlock = useCallback((block: ContentBlock) => {
        setEditingBlock(block);
        if (isImageBlock(block)) {
            setShowImageEditor(true);
        } else if (isVideoBlock(block)) {
            setShowVideoEditor(true);
        }
        // Post blocks are not editable — delete and re-add
    }, []);

    /**
     * Handle post save from editor
     */
    const handlePostSave = useCallback((data: {
        originalUrl: string;
        canonicalUrl: string;
        platform: PostPlatform;
        metadata: PostMetadata;
    }) => {
        const newBlock = createPostBlock(insertPosition, data);
        const updated = [...blocks];
        updated.splice(insertPosition, 0, newBlock);
        updateBlocks(reorderBlocks(updated));
        setShowPostEditor(false);
    }, [blocks, insertPosition, updateBlocks]);

    // ==========================================================================
    // RENDER BLOCKS
    // ==========================================================================

    /**
     * Render a text block (paragraph, subheading, quote)
     */
    const renderTextBlock = (block: ContentBlock, index: number) => {
        const content = 'content' in block ? block.content : '';
        const isFocused = focusedBlockId === block.id;

        let blockClass = styles.textBlock;
        let placeholderText = 'Type here...';

        switch (block.type) {
            case 'paragraph':
                blockClass = styles.paragraphBlock;
                placeholderText = index === 0 ? placeholder : 'Continue writing...';
                break;
            case 'subheading':
                blockClass = styles.subheadingBlock;
                placeholderText = 'Subheading...';
                break;
            case 'quote':
                blockClass = styles.quoteBlock;
                placeholderText = 'Quote text...';
                break;
        }

        return (
            <div key={block.id} className={styles.blockWrapper}>
                {/* Insert button above (except first block) */}
                {index > 0 && (
                    <button
                        type="button"
                        className={styles.insertButton}
                        onClick={() => openInsertMenu(index)}
                        title="Insert block"
                    >
                        +
                    </button>
                )}

                {/* Move Controls - Brought Down to Bottom Right */}
                <div className={styles.moveControls}>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === blocks.length - 1}
                        title="Move Down"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.deleteActionButton}
                        onClick={() => deleteBlock(block.id)}
                        title="Delete Block"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <textarea
                    ref={(el) => {
                        if (el) {
                            blockRefs.current.set(block.id, el);
                            // Initial resize when ref attaches without scroll jump
                            const scrollContainer = el.closest('[class*="writingCanvas"]') || document.documentElement;
                            const scrollTop = scrollContainer.scrollTop;
                            const windowY = window.scrollY;

                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;

                            scrollContainer.scrollTop = scrollTop;
                            window.scrollTo(window.scrollX, windowY);
                        } else {
                            blockRefs.current.delete(block.id);
                        }
                    }}
                    className={`${blockClass} ${isFocused ? styles.focused : ''}`}
                    value={content}
                    onChange={(e) => {
                        updateBlockContent(block.id, e.target.value);
                        // Instant visual resize for smooth typing without scroll jumping
                        const target = e.target as HTMLTextAreaElement;
                        const scrollContainer = target.closest('[class*="writingCanvas"]') || document.documentElement;
                        const scrollTop = scrollContainer.scrollTop;
                        const windowY = window.scrollY;

                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;

                        scrollContainer.scrollTop = scrollTop;
                        window.scrollTo(window.scrollX, windowY);
                    }}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onBlur={() => setFocusedBlockId(null)}
                    onKeyDown={(e) => handleBlockKeyDown(e, block, index)}
                    placeholder={placeholderText}
                    rows={1}
                />

                {/* Block type indicator */}
                <span className={styles.blockTypeLabel}>
                    {block.type}
                </span>
            </div>
        );
    };

    /**
     * Render an image block
     */
    const renderImageBlock = (block: ImageBlock, index: number) => {
        return (
            <div key={block.id} className={styles.blockWrapper}>
                {index > 0 && (
                    <button
                        type="button"
                        className={styles.insertButton}
                        onClick={() => openInsertMenu(index)}
                        title="Insert block"
                    >
                        +
                    </button>
                )}

                {/* Move Controls - Brought Down to Bottom Right */}
                <div className={styles.moveControls}>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === blocks.length - 1}
                        title="Move Down"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.deleteActionButton}
                        onClick={() => deleteBlock(block.id)}
                        title="Delete Block"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.mediaBlock}>
                    <div className={styles.mediaPreview}>
                        <Image
                            src={block.src}
                            alt={block.alt}
                            fill
                            sizes="120px"
                            className={styles.mediaImage}
                        />
                    </div>
                    <div className={styles.mediaInfo}>
                        <span className={styles.mediaType}>🖼 Image</span>
                        {block.caption && (
                            <span className={styles.mediaCaption}>{block.caption}</span>
                        )}
                        <span className={styles.mediaAlt}>Alt: {block.alt}</span>
                    </div>
                    <div className={styles.mediaActions}>
                        <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleEditMediaBlock(block)}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => deleteBlock(block.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render a video block
     */
    const renderVideoBlock = (block: VideoBlock, index: number) => {
        return (
            <div key={block.id} className={styles.blockWrapper}>
                {index > 0 && (
                    <button
                        type="button"
                        className={styles.insertButton}
                        onClick={() => openInsertMenu(index)}
                        title="Insert block"
                    >
                        +
                    </button>
                )}

                {/* Move Controls - Brought Down to Bottom Right */}
                <div className={styles.moveControls}>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === blocks.length - 1}
                        title="Move Down"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.deleteActionButton}
                        onClick={() => deleteBlock(block.id)}
                        title="Delete Block"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.mediaBlock}>
                    <div className={styles.mediaPreview}>
                        {block.posterThumbnail ? (
                            <Image
                                src={block.posterThumbnail}
                                alt={block.title || 'Video thumbnail'}
                                fill
                                sizes="120px"
                                className={styles.mediaImage}
                            />
                        ) : (
                            <div className={styles.videoPlaceholder}>🎬</div>
                        )}
                        <div className={styles.playOverlay}>▶</div>
                    </div>
                    <div className={styles.mediaInfo}>
                        <span className={styles.mediaType}>
                            🎬 {block.provider || block.sourceType}
                        </span>
                        {block.title && (
                            <span className={styles.mediaTitle}>{block.title}</span>
                        )}
                        <span className={styles.mediaCaption}>{block.caption}</span>
                        {block.credit && (
                            <span className={styles.mediaCredit}>Source: {block.credit}</span>
                        )}
                    </div>
                    <div className={styles.mediaActions}>
                        <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleEditMediaBlock(block)}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => deleteBlock(block.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render a post block
     */
    const renderPostBlock = (block: PostBlock, index: number) => {
        return (
            <div key={block.id} className={styles.blockWrapper}>
                {index > 0 && (
                    <button
                        type="button"
                        className={styles.insertButton}
                        onClick={() => openInsertMenu(index)}
                        title="Insert block"
                    >
                        +
                    </button>
                )}

                {/* Move Controls - Brought Down to Bottom Right */}
                <div className={styles.moveControls}>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.moveButton}
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === blocks.length - 1}
                        title="Move Down"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.deleteActionButton}
                        onClick={() => deleteBlock(block.id)}
                        title="Delete Block"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.mediaBlock}>
                    <div className={styles.mediaInfo} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ pointerEvents: 'none', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                            <SocialEmbed url={block.canonicalUrl || block.originalUrl} />
                        </div>
                    </div>
                    <div className={styles.mediaActions}>
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => deleteBlock(block.id)}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render a block based on type
     */
    const renderBlock = (block: ContentBlock, index: number) => {
        if (isImageBlock(block)) {
            return renderImageBlock(block, index);
        }
        if (isVideoBlock(block)) {
            return renderVideoBlock(block, index);
        }
        if (isPostBlock(block)) {
            return renderPostBlock(block as PostBlock, index);
        }
        return renderTextBlock(block, index);
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div className={styles.blockEditor}>
            {/* Header with media counter */}
            <div className={styles.editorHeader}>
                <MediaCounter summary={mediaSummary} />
            </div>

            {/* Blocks */}
            <div className={styles.blocksContainer}>
                {blocks.length === 0 ? (
                    // Empty state - show add block menu
                    <div className={styles.emptyState}>
                        <button
                            type="button"
                            className={styles.addFirstBlock}
                            onClick={() => openInsertMenu(0)}
                        >
                            + Add block
                        </button>
                    </div>
                ) : (
                    <>
                        {blocks.map((block, index) => renderBlock(block, index))}

                        {/* Insert button at end */}
                        <button
                            type="button"
                            className={styles.insertButtonEnd}
                            onClick={() => openInsertMenu(blocks.length)}
                            title="Add block"
                        >
                            + Add block
                        </button>
                    </>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className={styles.errorMessage}>{error}</div>
            )}

            {/* Insert Menu Modal */}
            {showInsertMenu && (
                <div className={styles.insertMenuOverlay} onClick={() => setShowInsertMenu(false)}>
                    <div className={styles.insertMenu} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.insertMenuHeader}>
                            Insert Block
                        </div>
                        <div className={styles.insertMenuOptions}>
                            {getInsertOptions().map((option) => (
                                <button
                                    key={option.type}
                                    type="button"
                                    className={`${styles.insertOption} ${option.disabled ? styles.disabled : ''}`}
                                    onClick={() => !option.disabled && handleInsertSelect(option.type)}
                                    disabled={option.disabled}
                                    title={option.reason}
                                >
                                    <span className={styles.insertOptionIcon}>{option.icon}</span>
                                    <span className={styles.insertOptionLabel}>{option.label}</span>
                                    {option.reason && (
                                        <span className={styles.insertOptionReason}>{option.reason}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Editor Modal */}
            {showImageEditor && (
                <ImageBlockEditor
                    block={editingBlock && isImageBlock(editingBlock) ? editingBlock : null}
                    onSave={handleImageSave}
                    onCancel={() => {
                        setShowImageEditor(false);
                        setEditingBlock(null);
                    }}
                />
            )}

            {/* Video Editor Modal */}
            {showVideoEditor && (
                <VideoBlockEditor
                    block={editingBlock && isVideoBlock(editingBlock) ? editingBlock : null}
                    currentVideoCount={mediaSummary.videoCount}
                    onSave={handleVideoSave}
                    onCancel={() => {
                        setShowVideoEditor(false);
                        setEditingBlock(null);
                    }}
                />
            )}

            {/* Post Editor Modal */}
            {showPostEditor && (
                <PostBlockEditor
                    currentPostCount={mediaSummary.postCount}
                    onSave={handlePostSave}
                    onCancel={() => setShowPostEditor(false)}
                />
            )}
        </div>
    );
}
