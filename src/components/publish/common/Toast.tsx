'use client';

/**
 * Toast Component
 * Auto-dismissing notification for success/error messages
 */

import { useEffect, useRef } from 'react';
import { ToastMessage } from '../types';
import styles from './Toast.module.css';

interface ToastProps {
    /** Toast message to display */
    toast: ToastMessage | null;
    /** Handler to dismiss toast */
    onDismiss: () => void;
    /** Auto-dismiss timeout in ms (default: 5000) */
    timeout?: number;
}

export function Toast({ toast, onDismiss, timeout = 5000 }: ToastProps) {
    const onDismissRef = useRef(onDismiss);
    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => onDismissRef.current(), timeout);
            return () => clearTimeout(timer);
        }
    }, [toast, timeout]);

    if (!toast) return null;

    return (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
            <span className={styles.message}>{toast.message}</span>
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
            <button type="button" className={styles.close} onClick={onDismiss}>
                ×
            </button>
        </div>
    );
}
