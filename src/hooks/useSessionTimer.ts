
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_THRESHOLD_MS = 15 * 1000; // 15 seconds remaining
const CHANNEL_NAME = 'the_hint_session_control';

interface UseSessionTimerProps {
    onLogout: (force?: boolean) => Promise<void>;
    onExtendStart?: () => void;
    onExtendSuccess?: () => void;
}

export function useSessionTimer({ onLogout, onExtendStart, onExtendSuccess }: UseSessionTimerProps) {
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS);
    const [showWarning, setShowWarning] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const isExtendingRef = useRef(false);

    // Use ref for session start to persist across renders without triggering them
    const sessionStartRef = useRef<number>(Date.now());
    const channelRef = useRef<BroadcastChannel | null>(null);

    const resetTimer = useCallback(() => {
        sessionStartRef.current = Date.now();
        setTimeLeft(SESSION_DURATION_MS);
        setShowWarning(false);
    }, []);

    const handleExpiry = useCallback(async () => {
        // Prevent expiry if extension is in progress
        if (isExtendingRef.current) return;
        // Auto-logout: Pass force=true
        await onLogout(true);
    }, [onLogout]);

    // Initial setup & Server Sync
    useEffect(() => {
        const syncServerTime = async () => {
            try {
                const res = await fetch('/api/auth/session-status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated && typeof data.remainingMs === 'number') {
                        // Align client timer with server expiry
                        const remaining = data.remainingMs;
                        // Calculate "start time" relative to now that would result in this remaining time
                        sessionStartRef.current = Date.now() - (SESSION_DURATION_MS - remaining);
                        setTimeLeft(remaining);
                    }
                } else if (res.status === 401) {
                    // Session invalid/expired on server
                    await onLogout(true);
                }
            } catch (e) {
                console.error('Failed to sync session time', e);
            }
        };

        syncServerTime();

        // Multi-tab sync
        if (typeof BroadcastChannel !== 'undefined') {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);
            channelRef.current.onmessage = (event) => {
                if (event.data === 'LOGOUT') {
                    onLogout(true);
                } else if (event.data === 'EXTEND') {
                    resetTimer();
                    // Re-sync with server on extend too
                    syncServerTime();
                }
            };
        }

        return () => {
            if (channelRef.current) {
                channelRef.current.close();
            }
        };
    }, [onLogout, resetTimer]);

    // Timer logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (isExtendingRef.current) return;

            const now = Date.now();
            const elapsed = now - sessionStartRef.current;
            const remaining = Math.max(0, SESSION_DURATION_MS - elapsed);

            setTimeLeft(remaining);

            // Warning Trigger
            if (remaining <= WARNING_THRESHOLD_MS && remaining > 0 && !showWarning) {
                setShowWarning(true);
            }

            // Expiry Trigger
            if (remaining <= 0) {
                clearInterval(interval);
                handleExpiry();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [showWarning, handleExpiry]);

    // Mobile visibility check
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const elapsed = now - sessionStartRef.current;

                // If we exceeded duration while backgrounded
                if (elapsed >= SESSION_DURATION_MS) {
                    handleExpiry();
                } else if (SESSION_DURATION_MS - elapsed <= WARNING_THRESHOLD_MS) {
                    // If we woke up inside the warning window
                    setShowWarning(true);
                    setTimeLeft(SESSION_DURATION_MS - elapsed);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleExpiry]);

    const handleExtendSession = async () => {
        if (isExtendingRef.current) return;

        isExtendingRef.current = true;
        setIsExtending(true);
        onExtendStart?.();

        try {
            const response = await fetch('/api/auth/refresh-session', {
                method: 'POST',
            });

            if (response.ok) {
                resetTimer();
                // Notify other tabs
                if (channelRef.current) {
                    channelRef.current.postMessage('EXTEND');
                }
                onExtendSuccess?.();
            } else {
                // Refresh failed (likely too late), force logout
                await onLogout(true);
            }
        } catch (error) {
            console.error('Session extend failed', error);
            // Don't force logout immediately on network error, but timer will eventually kill it
        } finally {
            isExtendingRef.current = false;
            setIsExtending(false);
        }
    };

    const handleLogoutWithSync = async () => {
        if (channelRef.current) {
            channelRef.current.postMessage('LOGOUT');
        }
        await onLogout(false); // User initiated = not forced (allows save check)
    };

    return {
        timeLeft,
        showWarning,
        isExtending,
        handleExtendSession,
        handleLogout: handleLogoutWithSync,
    };
}
