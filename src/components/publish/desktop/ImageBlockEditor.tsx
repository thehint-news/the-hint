/**
 * Image Block Editor Modal
 * Modal for uploading and configuring image blocks
 * 
 * DESIGN SPEC: .agent/specifications/MEDIA_SYSTEM_DESIGN.md
 */

'use client';

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import type { ImageBlock, ImageAspectRatio } from '@/lib/content/media-types';
import { ALLOWED_IMAGE_FORMATS, MAX_IMAGE_SIZE_BYTES } from '@/lib/content/media-types';
import styles from './ImageBlockEditor.module.css';

interface ImageBlockEditorProps {
    /** Block being edited (null for new block) */
    block: ImageBlock | null;
    /** Callback when save is clicked */
    onSave: (data: {
        src: string;
        alt: string;
        caption?: string;
        credit?: string;
        width: number;
        height: number;
        aspectRatio: ImageAspectRatio;
        srcset?: string;
    }) => void;
    /** Callback when cancel is clicked */
    onCancel: () => void;
}

export function ImageBlockEditor({ block, onSave, onCancel }: ImageBlockEditorProps) {
    // Form state
    const [src, setSrc] = useState(block?.src || '');
    const [alt, setAlt] = useState(block?.alt || '');
    const [caption, setCaption] = useState(block?.caption || '');
    const [credit, setCredit] = useState(block?.credit || '');
    const [width, setWidth] = useState(block?.width || 0);
    const [height, setHeight] = useState(block?.height || 0);
    const [srcset, setSrcset] = useState(block?.srcset || '');

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(block?.src || null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Handle file selection
     */
    const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);

        // Validate file type
        if (!ALLOWED_IMAGE_FORMATS.includes(file.type as typeof ALLOWED_IMAGE_FORMATS[number])) {
            setUploadError('Invalid file type. Please use JPEG, PNG, WebP, or AVIF.');
            return;
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            const maxMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
            setUploadError(`File is too large. Maximum size is ${maxMB}MB.`);
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Get image dimensions
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            setWidth(img.naturalWidth);
            setHeight(img.naturalHeight);
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;

        // Reset input value so the same file can be selected again
        e.target.value = '';

        // Upload file
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.data) {
                setSrc(result.data.url);
                setSrcset(result.data.srcset || '');
                setWidth(result.data.width);
                setHeight(result.data.height);
            } else {
                setUploadError(result.error || 'Upload failed');
            }
        } catch (error) {
            setUploadError('Network error during upload');
        } finally {
            setIsUploading(false);
        }
    }, []);

    /**
     * Handle save
     */
    const handleSave = useCallback(() => {
        if (!src) {
            setUploadError('Please upload an image first');
            return;
        }

        if (!alt.trim()) {
            setUploadError('Alt text is required for accessibility');
            return;
        }

        // Calculate aspect ratio
        const ratio = width / height;
        let aspectRatio: ImageAspectRatio = 'original';
        if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatio = '16:9';
        else if (Math.abs(ratio - 4 / 3) < 0.1) aspectRatio = '4:3';
        else if (Math.abs(ratio - 3 / 2) < 0.1) aspectRatio = '3:2';
        else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';

        onSave({
            src,
            alt: alt.trim(),
            caption: caption.trim() || undefined,
            credit: credit.trim() || undefined,
            width,
            height,
            aspectRatio,
            srcset: srcset || undefined,
        });
    }, [src, alt, caption, credit, width, height, srcset, onSave]);

    const isEditing = !!block;
    const canSave = !!src && !!alt.trim() && !isUploading;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {isEditing ? 'Edit Image' : 'Insert Image'}
                    </h3>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onCancel}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Image Preview / Upload Area */}
                    <div className={styles.uploadArea}>
                        {previewUrl ? (
                            <div className={styles.imagePreviewContainer}>
                                <div className={styles.preview}>
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className={styles.previewImage}
                                    />
                                </div>
                                <div className={styles.previewActions}>
                                    <button
                                        type="button"
                                        className={styles.changeButton}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className={styles.spinner} />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                    <circle cx="12" cy="13" r="4"></circle>
                                                </svg>
                                                <span>Replace Image</span>
                                            </>
                                        )}
                                    </button>
                                    <span className={styles.actionHint}>Click to upload a different photo</span>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={styles.dropzone}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span className={styles.dropzoneIcon}>🖼</span>
                                <span className={styles.dropzoneText}>
                                    Click to upload image
                                </span>
                                <span className={styles.dropzoneHint}>
                                    JPEG, PNG, WebP, or AVIF • Max 5MB
                                </span>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ALLOWED_IMAGE_FORMATS.join(',')}
                            onChange={handleFileSelect}
                            className={styles.fileInput}
                        />
                    </div>

                    {isUploading && (
                        <div className={styles.uploading}>
                            Uploading...
                        </div>
                    )}

                    {uploadError && (
                        <div className={styles.error}>
                            {uploadError}
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className={styles.fields}>
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Alt Text <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={alt}
                                onChange={(e) => setAlt(e.target.value)}
                                placeholder="Describe the image for accessibility"
                                className={styles.input}
                            />
                            <span className={styles.hint}>
                                Required. Describes the image for screen readers.
                            </span>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>
                                Caption <span className={styles.optional}>(recommended)</span>
                            </label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Caption displayed below the image"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>
                                Credit <span className={styles.optional}>(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={credit}
                                onChange={(e) => setCredit(e.target.value)}
                                placeholder="Photographer or source credit"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    {/* Dimensions Info */}
                    {width > 0 && height > 0 && (
                        <div className={styles.dimensions}>
                            {width} × {height} px
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!canSave}
                    >
                        {isEditing ? 'Save Changes' : 'Insert Image'}
                    </button>
                </div>
            </div>
        </div>
    );
}
