/**
 * LeadMediaManager Component
 * 
 * Manages lead story thumbnail images with:
 * - Drag and drop upload
 * - Preview grid with reordering
 * - Delete functionality
 * - Count indicator (e.g., 2/3 used)
 * - Hard stop at 3 images
 * 
 * PERFORMANCE:
 * - Client-side only (no SSR)
 * - Optimistic UI updates
 * - Lazy loading for previews
 */

'use client';

import React, { useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import type { LeadStoryImageData } from '../types/article-types';
import styles from './LeadMediaManager.module.css';

interface LeadMediaManagerProps {
    /** Current lead images */
    images: LeadStoryImageData[];
    /** Callback when images change */
    onChange: (images: LeadStoryImageData[]) => void;
    /** Maximum number of images allowed */
    maxImages?: number;
    /** Whether the field is disabled */
    disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * LeadMediaManager - Lead Story Thumbnail Manager
 * 
 * Provides a drag-and-drop interface for managing up to 3 lead story images.
 */
export function LeadMediaManager({
    images = [],
    onChange,
    maxImages = 3,
    disabled = false,
}: LeadMediaManagerProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const remainingSlots = maxImages - images.length;
    const isAtLimit = images.length >= maxImages;

    /**
     * Validate and process uploaded file
     */
    const processFile = useCallback(async (file: File): Promise<LeadStoryImageData | null> => {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setUploadError('Only JPEG, PNG, and WebP images are allowed');
            return null;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setUploadError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
            return null;
        }

        setUploadError(null);

        try {
            // Upload file to media storage via API
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const result = await response.json();

            if (!result.success || !result.data?.url) {
                throw new Error('Invalid upload response');
            }

            // Get image dimensions for aspect ratio
            const img = document.createElement('img');
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = result.data.url;
            });

            return {
                url: result.data.url,
                alt: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                width: img.naturalWidth,
                height: img.naturalHeight,
            };
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
            return null;
        }
    }, []);

    /**
     * Handle file drop
     */
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled || isAtLimit) return;

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length === 0) return;

        // Process files up to remaining slots
        const filesToProcess = files.slice(0, remainingSlots);
        const newImages: LeadStoryImageData[] = [];

        for (const file of filesToProcess) {
            const imageData = await processFile(file);
            if (imageData) {
                newImages.push(imageData);
            }
        }

        if (newImages.length > 0) {
            onChange([...images, ...newImages]);
        }
    }, [disabled, isAtLimit, remainingSlots, images, onChange, processFile]);

    /**
     * Handle file input change
     */
    const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Process files up to remaining slots
        const filesToProcess = files.slice(0, remainingSlots);
        const newImages: LeadStoryImageData[] = [];

        for (const file of filesToProcess) {
            const imageData = await processFile(file);
            if (imageData) {
                newImages.push(imageData);
            }
        }

        if (newImages.length > 0) {
            onChange([...images, ...newImages]);
        }

        // Reset input
        e.target.value = '';
    }, [remainingSlots, images, onChange, processFile]);

    /**
     * Handle drag start for reordering
     */
    const handleDragStart = useCallback((index: number) => {
        setDraggedIndex(index);
    }, []);

    /**
     * Handle drag over for reordering
     */
    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Reorder images
        const newImages = [...images];
        const [movedImage] = newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, movedImage);

        onChange(newImages);
        setDraggedIndex(index);
    }, [draggedIndex, images, onChange]);

    /**
     * Handle drag end
     */
    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    /**
     * Delete an image
     */
    const handleDelete = useCallback((index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onChange(newImages);
        setUploadError(null);
    }, [images, onChange]);

    /**
     * Update alt text for an image
     */
    const handleAltChange = useCallback((index: number, alt: string) => {
        const newImages = images.map((img, i) =>
            i === index ? { ...img, alt } : img
        );
        onChange(newImages);
    }, [images, onChange]);

    /**
     * Open file picker
     */
    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className={styles.container}>
            {/* Header with count */}
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <span className={styles.label}>Lead Story Thumbnails</span>
                    <span className={`${styles.count} ${isAtLimit ? styles.countFull : ''}`}>
                        {images.length}/{maxImages}
                    </span>
                </div>
                <span className={styles.sublabel}>
                    {isAtLimit
                        ? 'Maximum images reached'
                        : `Drag & drop up to ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}`}
                </span>
            </div>

            {/* Error message */}
            {uploadError && (
                <div className={styles.error} role="alert">
                    {uploadError}
                    <button
                        onClick={() => setUploadError(null)}
                        className={styles.errorClose}
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Drop zone (only show if not at limit) */}
            {!isAtLimit && (
                <div
                    className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openFilePicker();
                        }
                    }}
                    aria-label="Click or drag and drop images to upload"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileInput}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.fileInput}
                        aria-hidden="true"
                    />
                    <div className={styles.dropZoneContent}>
                        <svg
                            className={styles.dropIcon}
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className={styles.dropText}>
                            Click or drag images here
                        </span>
                        <span className={styles.dropHint}>
                            JPEG, PNG, WebP up to {MAX_FILE_SIZE_MB}MB
                        </span>
                    </div>
                </div>
            )}

            {/* Image preview grid */}
            {images.length > 0 && (
                <div className={styles.previewGrid} role="list" aria-label="Lead story images">
                    {images.map((image, index) => (
                        <div
                            key={`${image.url}-${index}`}
                            className={`${styles.previewItem} ${draggedIndex === index ? styles.draggingItem : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            role="listitem"
                        >
                            {/* Drag handle */}
                            <div className={styles.dragHandle} aria-label="Drag to reorder">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="9" cy="12" r="1" />
                                    <circle cx="9" cy="5" r="1" />
                                    <circle cx="9" cy="19" r="1" />
                                    <circle cx="15" cy="12" r="1" />
                                    <circle cx="15" cy="5" r="1" />
                                    <circle cx="15" cy="19" r="1" />
                                </svg>
                            </div>

                            {/* Image preview */}
                            <div className={styles.imageContainer}>
                                <Image
                                    src={image.url}
                                    alt={image.alt}
                                    fill
                                    sizes="200px"
                                    className={styles.previewImage}
                                    loading="lazy"
                                />
                            </div>

                            {/* Image number indicator */}
                            <div className={styles.imageNumber}>{index + 1}</div>

                            {/* Alt text input */}
                            <input
                                type="text"
                                value={image.alt}
                                onChange={(e) => handleAltChange(index, e.target.value)}
                                placeholder="Image description (alt text)"
                                className={styles.altInput}
                                aria-label={`Alt text for image ${index + 1}`}
                            />

                            {/* Delete button */}
                            <button
                                onClick={() => handleDelete(index)}
                                className={styles.deleteButton}
                                aria-label={`Remove image ${index + 1}`}
                                type="button"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Helper text */}
            {images.length > 0 && (
                <div className={styles.helperText}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Drag images to reorder. First image will be shown first.
                </div>
            )}
        </div>
    );
}
