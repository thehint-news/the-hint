'use client';
import styles from './SessionExpiryModal.module.css';

interface SessionExpiryModalProps {
    isOpen: boolean;
    timeLeftMs: number;
    onExtend: () => void;
    onLogout: () => void;
    isExtending: boolean;
}

export function SessionExpiryModal({
    isOpen,
    timeLeftMs,
    onExtend,
    onLogout,
    isExtending,
}: SessionExpiryModalProps) {
    if (!isOpen) return null;

    const seconds = Math.ceil(Math.max(timeLeftMs, 0) / 1000);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="session-title">
                <h2 className={styles.title} id="session-title">Session Expiring</h2>

                <div className={styles.countdown}>
                    {seconds}
                </div>

                <p className={styles.message}>
                    Unsaved changes will be automatically saved before logout.
                </p>

                <div className={styles.actions}>
                    <button
                        onClick={onLogout}
                        className={`${styles.button} ${styles.logoutButton}`}
                        disabled={isExtending}
                    >
                        Log Out
                    </button>

                    <button
                        onClick={onExtend}
                        className={`${styles.button} ${styles.extendButton}`}
                        disabled={isExtending}
                    >
                        {isExtending ? 'Extending...' : 'Extend Session'}
                    </button>
                </div>
            </div>
        </div>
    );
}
