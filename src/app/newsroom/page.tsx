
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import './newsroom.css';
import Link from 'next/link';
import { ErrorCodes, getErrorMessage, logger } from '@/lib/feedback';
import { SkeletonBlock } from '@/components/skeleton';

function getUrlErrorMessage(error: string): string {
    const errorMap: Record<string, string> = {
        'expired': 'Link expired. Request a new one.',
        'invalid': 'Invalid link. Request a new one.',
        'used': 'Link already used. Request a new one.',
        'unauthorized': 'Access denied.',
    };
    return errorMap[error.toLowerCase()] || error;
}

function LoginForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(true);

    const searchParams = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            setStatus('error');
            setMessage(getUrlErrorMessage(decodeURIComponent(error)));
        }
    }, [searchParams]);

    const validateEmail = (value: string) => {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        setIsEmailValid(value === '' || valid);
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setStatus('error');
            setMessage(getErrorMessage(ErrorCodes.VALIDATION_INVALID_EMAIL).message);
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Request failed. Try again.');
            }

            setStatus('success');
            setMessage('Check your inbox for the sign-in link.');
        } catch (err) {
            logger.error('Login request failed', err);
            setStatus('error');
            setMessage(getErrorMessage(ErrorCodes.NETWORK_REQUEST_FAILED).message);
        }
    };

    return (
        <main className="page">
            <div className="container">
                {/* Masthead */}
                <header className="header">
                    <Link href="/" className="back-to-site">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to site
                    </Link>
                    <h1 className="logo">THE HINT</h1>
                    <span className="divider"></span>
                    <p className="subtitle">Newsroom</p>
                </header>

                {/* Card */}
                <div className="card">
                    {status === 'success' ? (
                        <div className="success">
                            <div className="success-check">✓</div>
                            <h2>Check your email</h2>
                            <p className="success-text">{message}</p>
                            <p className="success-note">Link expires in 30 minutes</p>
                            <button
                                onClick={() => { setStatus('idle'); setEmail(''); }}
                                className="link-btn"
                            >
                                ← Try different email
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="title">Sign in</h2>
                            <p className="desc">Enter your email to receive a secure link</p>

                            <form onSubmit={handleSubmit}>
                                <div className="field">
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (status === 'error') { setStatus('idle'); setMessage(''); }
                                            validateEmail(e.target.value);
                                        }}
                                        className={`input ${!isEmailValid || status === 'error' ? 'input-error' : ''}`}
                                        placeholder="you@example.com"
                                        disabled={status === 'loading'}
                                        autoComplete="email"
                                        autoFocus
                                    />
                                    {!isEmailValid && email && (
                                        <span className="error-text">Enter a valid email</span>
                                    )}
                                </div>

                                {status === 'error' && (
                                    <div className="error-box">{message}</div>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !email || !isEmailValid}
                                    className="btn"
                                >
                                    {status === 'loading' ? 'Sending...' : 'Send Link'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <footer className="footer">
                    <p>Authorized access only</p>
                </footer>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="page">
                <div className="container" aria-hidden="true">
                    {/* Masthead skeleton */}
                    <div className="header">
                        <SkeletonBlock width="140px" height="28px" isHeadline style={{ margin: '0 auto', marginBottom: '16px' }} />
                        <span className="divider" style={{ opacity: 0.3 }}></span>
                        <SkeletonBlock width="80px" height="13px" style={{ margin: '0 auto' }} />
                    </div>

                    {/* Card skeleton */}
                    <div className="card">
                        {/* Title skeleton */}
                        <div style={{ marginBottom: '8px' }}>
                            <SkeletonBlock width="80px" height="24px" isHeadline />
                        </div>
                        {/* Desc skeleton */}
                        <div style={{ marginBottom: '28px' }}>
                            <SkeletonBlock width="200px" height="14px" />
                        </div>

                        {/* Input skeleton */}
                        <div style={{ marginBottom: '20px' }}>
                            <SkeletonBlock width="100%" height="48px" />
                        </div>

                        {/* Button skeleton */}
                        <SkeletonBlock width="100%" height="48px" />

                        {/* Secure text skeleton */}
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                            <SkeletonBlock width="120px" height="12px" />
                        </div>
                    </div>
                </div>
                <span className="sr-only" role="status" aria-live="polite">
                    Content loading
                </span>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
