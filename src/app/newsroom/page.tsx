
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

            <style jsx>{`
                .page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8f7f4;
                    padding: 24px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }

                .container {
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                }

                .header {
                    margin-bottom: 32px;
                    position: relative;
                }

                .back-to-site {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #888;
                    text-decoration: none;
                    margin-bottom: 24px;
                    transition: color 0.15s ease;
                }

                .back-to-site:hover {
                    color: #111;
                }

                .logo {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 0.15em;
                    color: #111;
                    margin: 0;
                }

                .divider {
                    display: block;
                    width: 40px;
                    height: 2px;
                    background: #111;
                    margin: 16px auto;
                }

                .subtitle {
                    font-size: 13px;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: #666;
                    margin: 0;
                }

                .card {
                    background: #fff;
                    border: 1px solid #e5e5e5;
                    padding: 40px 36px;
                    text-align: left;
                }

                .title {
                    font-family: Georgia, serif;
                    font-size: 24px;
                    font-weight: 400;
                    color: #111;
                    margin: 0 0 8px 0;
                }

                .desc {
                    font-size: 14px;
                    color: #666;
                    margin: 0 0 28px 0;
                }

                .field {
                    margin-bottom: 20px;
                }

                .input {
                    width: 100%;
                    padding: 14px 16px;
                    font-size: 15px;
                    border: 1px solid #ddd;
                    background: #fafafa;
                    outline: none;
                    transition: border-color 0.15s, background 0.15s;
                }

                .input:focus {
                    border-color: #111;
                    background: #fff;
                }

                .input::placeholder {
                    color: #999;
                }

                .input:disabled {
                    opacity: 0.6;
                }

                .input-error {
                    border-color: #e53935;
                    background: #fff5f5;
                }

                .error-text {
                    display: block;
                    font-size: 12px;
                    color: #e53935;
                    margin-top: 6px;
                }

                .error-box {
                    background: #fff5f5;
                    border: 1px solid #ffcdd2;
                    color: #c62828;
                    font-size: 13px;
                    padding: 12px 14px;
                    margin-bottom: 20px;
                }

                .btn {
                    width: 100%;
                    padding: 14px;
                    background: #111;
                    color: #fff;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: background 0.15s;
                }

                .btn:hover:not(:disabled) {
                    background: #333;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .secure {
                    text-align: center;
                    font-size: 12px;
                    color: #999;
                    margin: 20px 0 0 0;
                }

                /* Success */
                .success {
                    text-align: center;
                    padding: 16px 0;
                }

                .success-check {
                    width: 48px;
                    height: 48px;
                    background: #2e7d32;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin: 0 auto 20px auto;
                }

                .success h2 {
                    font-family: Georgia, serif;
                    font-size: 22px;
                    font-weight: 400;
                    color: #111;
                    margin: 0 0 8px 0;
                }

                .success-text {
                    font-size: 14px;
                    color: #444;
                    margin: 0 0 6px 0;
                }

                .success-note {
                    font-size: 12px;
                    color: #888;
                    margin: 0 0 24px 0;
                }

                .link-btn {
                    background: none;
                    border: 1px solid #ddd;
                    color: #666;
                    font-size: 13px;
                    padding: 10px 20px;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .link-btn:hover {
                    border-color: #111;
                    color: #111;
                }

                .footer {
                    margin-top: 32px;
                }

                .footer p {
                    font-size: 11px;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #aaa;
                    margin: 0;
                }

                @media (max-width: 480px) {
                    .card {
                        padding: 32px 24px;
                    }
                    .logo {
                        font-size: 24px;
                    }
                }
            `}</style>
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
