/**
 * Editorial Toast Component
 * 
 * A human-friendly toast notification system that displays
 * translated error and success messages in editorial style.
 * 
 * Features:
 * - Auto-dismiss with configurable timing
 * - Multiple toast types (success, error, warning, info)
 * - Contextual styling based on feedback type
 * - Optional action links
 * - Accessible with ARIA attributes
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './EditorialToast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
    id: string;
    type: ToastType;
    message: string;
    guidance?: string;
    link?: {
        url: string;
        label: string;
    };
    /** Auto-dismiss timeout in ms (default: 5000) */
    timeout?: number;
    /** Whether this toast can be dismissed by clicking */
    dismissible?: boolean;
}

interface EditorialToastProps {
    /** Toast to display */
    toast: ToastData | null;
    /** Handler to dismiss toast */
    onDismiss: () => void;
}

/**
 * Get the appropriate icon for each toast type
 */
function getToastIcon(type: ToastType): string {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '!';
        case 'warning':
            return '⚠';
        case 'info':
            return 'i';
        default:
            return '';
    }
}

/**
 * Get ARIA role for toast type
 */
function getAriaRole(type: ToastType): 'alert' | 'status' {
    return type === 'error' ? 'alert' : 'status';
}

/**
 * Editorial Toast Component
 */
export function EditorialToast({ toast, onDismiss }: EditorialToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    // Use a ref for onDismiss so it doesn't cause timer resets on every parent render
    const onDismissRef = useRef(onDismiss);
    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    // Handle dismiss with exit animation
    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            setIsExiting(false);
            onDismissRef.current();
        }, 200);
    }, []);

    // Handle auto-dismiss
    useEffect(() => {
        if (!toast) return;

        const timeout = toast.timeout ?? 5000;
        const timer = setTimeout(() => {
            handleDismiss();
        }, timeout);

        return () => clearTimeout(timer);
    }, [toast, handleDismiss]);

    if (!toast) return null;

    return (
        <div
            className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ''}`}
            role={getAriaRole(toast.type)}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
            <span className={styles.icon} aria-hidden="true">
                {getToastIcon(toast.type)}
            </span>

            <div className={styles.content}>
                <span className={styles.message}>{toast.message}</span>
                {toast.guidance && (
                    <span className={styles.guidance}>{toast.guidance}</span>
                )}
            </div>

            {toast.link && (
                <a
                    href={toast.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                >
                    {toast.link.label} →
                </a>
            )}

            {(toast.dismissible !== false) && (
                <button
                    type="button"
                    className={styles.close}
                    onClick={handleDismiss}
                    aria-label="Dismiss notification"
                >
                    ×
                </button>
            )}
        </div>
    );
}

/**
 * Toast Container for multiple toasts
 * Positioned at the top of the viewport
 */
interface ToastContainerProps {
    toasts: ToastData[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    // Only show the first toast (progressive disclosure)
    const currentToast = toasts[0];

    return (
        <div className={styles.container}>
            <EditorialToast
                toast={currentToast}
                onDismiss={() => onDismiss(currentToast.id)}
            />
        </div>
    );
}
