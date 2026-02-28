/**
 * Mobile Settings Panel
 * Bottom sheet component for article metadata on mobile devices
 * 
 * Contains:
 * - Section selector
 * - Content type
 * - Tags
 * - Sources
 * - Homepage Placement
 * - Status indicator
 * 
 * Opens as a full-height bottom sheet on mobile
 * Closes with swipe down, close button, or backdrop tap
 */

'use client';

import { useState, useCallback, useRef, useEffect, ChangeEvent } from 'react';
import {
    ArticleFormData,
    FieldErrors,
    SECTIONS,
    CONTENT_TYPES,
} from '../types';
import { LeadMediaManager } from '../common/LeadMediaManager';
import styles from './MobileSettingsPanel.module.css';

interface MobileSettingsPanelProps {
    /** Form data */
    formData: ArticleFormData;
    /** Handler for form changes */
    onFormChange: (data: ArticleFormData) => void;
    /** Field errors from validation */
    fieldErrors: FieldErrors;
    /** Client-side hints */
    clientHints: Record<string, string>;
    /** Whether the panel is open */
    isOpen: boolean;
    /** Handler to close the panel */
    onClose: () => void;
}

export function MobileSettingsPanel({
    formData,
    onFormChange,
    fieldErrors,
    clientHints,
    isOpen,
    onClose,
}: MobileSettingsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [startY, setStartY] = useState<number | null>(null);
    const [currentY, setCurrentY] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    /**
     * Handle input changes
     */
    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            onFormChange({ ...formData, [name]: value });
        },
        [formData, onFormChange]
    );

    /**
     * Handle placement toggle
     */
    const handlePlacementChange = useCallback(
        (placement: 'lead' | 'top' | 'standard') => {
            const newPlacement = formData.placement === placement ? 'standard' : placement;
            // Sync isLead with placement for backward compatibility
            const isLead = newPlacement === 'lead';
            onFormChange({ ...formData, placement: newPlacement, isLead });
        },
        [formData, onFormChange]
    );

    /**
     * Handle lead images change
     */
    const handleLeadImagesChange = useCallback(
        (leadImages: ArticleFormData['leadImages']) => {
            onFormChange({ ...formData, leadImages });
        },
        [formData, onFormChange]
    );

    /**
     * Format date for display
     */
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    // Touch handlers for swipe-to-close
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only initiate drag from the header area
        const target = e.target as HTMLElement;
        if (target.closest(`.${styles.panelHeader}`)) {
            setStartY(e.touches[0].clientY);
            setIsDragging(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (startY !== null && isDragging) {
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 0) { // Only allow dragging down
                setCurrentY(deltaY);
            }
        }
    }, [startY, isDragging]);

    const handleTouchEnd = useCallback(() => {
        if (currentY !== null && currentY > 100) {
            // If dragged more than 100px down, close the panel
            onClose();
        }
        setStartY(null);
        setCurrentY(null);
        setIsDragging(false);
    }, [currentY, onClose]);

    // Lock body scroll when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Calculate panel transform for drag animation
    const panelStyle = currentY !== null && currentY > 0
        ? { transform: `translateY(${currentY}px)` }
        : {};

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                ref={panelRef}
                className={styles.panel}
                style={panelStyle}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Panel Header with drag handle */}
                <div className={styles.panelHeader}>
                    <div className={styles.dragHandle} />
                    <h2 className={styles.panelTitle}>Article Settings</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        ×
                    </button>
                </div>

                {/* Panel Content */}
                <div className={styles.panelContent}>
                    {/* Section */}
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>Section <span className={styles.required}>*</span></label>
                        <select
                            name="section"
                            value={formData.section}
                            onChange={handleInputChange}
                            className={`${styles.select} ${fieldErrors.section ? styles.inputError : ''}`}
                        >
                            {SECTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        {fieldErrors.section && (
                            <span className={styles.fieldError}>{fieldErrors.section}</span>
                        )}
                    </div>

                    {/* Content Type */}
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>Content Type <span className={styles.required}>*</span></label>
                        <select
                            name="contentType"
                            value={formData.contentType}
                            onChange={handleInputChange}
                            className={`${styles.select} ${fieldErrors.contentType ? styles.inputError : ''}`}
                        >
                            {CONTENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        {fieldErrors.contentType && (
                            <span className={styles.fieldError}>{fieldErrors.contentType}</span>
                        )}
                        {!fieldErrors.contentType && clientHints.contentType && (
                            <span className={styles.fieldWarning}>⚠ {clientHints.contentType}</span>
                        )}
                    </div>

                    {/* Tags */}
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>
                            Tags <span className={styles.optional}>(optional, max 10)</span>
                        </label>
                        <input
                            type="text"
                            name="tags"
                            className={`${styles.input} ${fieldErrors.tags ? styles.inputError : ''}`}
                            placeholder="Add tags, separated by commas..."
                            value={formData.tags}
                            onChange={handleInputChange}
                        />
                        {fieldErrors.tags && (
                            <span className={styles.fieldError}>{fieldErrors.tags}</span>
                        )}
                    </div>

                    {/* Sources */}
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>
                            Sources <span className={styles.optional}>(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="sources"
                            className={`${styles.input} ${fieldErrors.sources ? styles.inputError : ''}`}
                            placeholder="Add sources, separated by commas..."
                            value={formData.sources}
                            onChange={handleInputChange}
                        />
                        {fieldErrors.sources && (
                            <span className={styles.fieldError}>{fieldErrors.sources}</span>
                        )}
                    </div>

                    {/* Homepage Placement */}
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>Homepage Placement</label>
                        <div className={styles.placementGrid}>
                            <button
                                type="button"
                                onClick={() => handlePlacementChange('lead')}
                                className={`${styles.placementOption} ${formData.placement === 'lead' ? styles.placementActive : ''}`}
                            >
                                <div className={styles.placementTitle}>Lead Story</div>
                                <div className={styles.placementDesc}>Main hero story</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePlacementChange('top')}
                                className={`${styles.placementOption} ${formData.placement === 'top' ? styles.placementActive : ''}`}
                            >
                                <div className={styles.placementTitle}>Top Story</div>
                                <div className={styles.placementDesc}>Secondary lead</div>
                            </button>
                        </div>
                        <div className={styles.placementHint}>
                            ℹ {formData.placement === 'standard'
                                ? 'Article will appear in its section normally.'
                                : `Selected: ${formData.placement === 'lead' ? 'Lead Story' : 'Top Story'}. Tap to deselect.`}
                        </div>
                    </div>

                    {/* Lead Story Media Manager - Only show when isLead is true */}
                    {formData.isLead && (
                        <div className={styles.controlGroup}>
                            <LeadMediaManager
                                images={formData.leadImages}
                                onChange={handleLeadImagesChange}
                                maxImages={3}
                            />
                        </div>
                    )}

                    {/* Status Indicator */}
                    <div className={styles.statusSection}>
                        <div className={styles.statusLabel}>
                            Status: <span className={formData.status === 'published' ? styles.statusPublished : styles.statusDraft}>
                                {formData.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        {formData.publishedAt && (
                            <div className={styles.statusDate}>
                                Published: {formatDate(formData.publishedAt)}
                            </div>
                        )}
                        {formData.lastEdited && (
                            <div className={styles.statusDate}>
                                Last edited: {formatDate(formData.lastEdited)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Done Button */}
                <div className={styles.panelFooter}>
                    <button
                        type="button"
                        className={styles.doneButton}
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
