'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { SkeletonBlock } from '@/components/skeleton';
import { kn } from "@/lib/i18n/kn";

function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const resultStatus = searchParams.get('status');
    const resultMessage = searchParams.get('message');

    // State for manual unsubscribe form
    const [email, setEmail] = useState('');
    const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [formMessage, setFormMessage] = useState('');

    // Determine view state
    const isManualSuccess = formStatus === 'success';
    const isResultView = resultStatus !== null || isManualSuccess;
    const isSuccess = resultStatus === 'success' || isManualSuccess;

    // Display message
    const displayMessage = isManualSuccess ? formMessage : resultMessage;

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setFormStatus('loading');
        setFormMessage('');

        try {
            const res = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFormStatus('success');
                setFormMessage(data.message);
                setEmail(''); // Clear form
            } else {
                setFormStatus('error');
                setFormMessage(data.error || data.message || 'Failed to unsubscribe.');
            }
        } catch {
            setFormStatus('error');
            setFormMessage('An error occurred. Please try again.');
        }
    };

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            fontFamily: 'Georgia, serif',
            padding: '20px',
        }}>
            <div style={{
                maxWidth: '500px',
                width: '100%',
                backgroundColor: '#ffffff',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid #e5e5e5',
            }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    marginBottom: '30px',
                    color: '#111',
                }}>
                    {kn.brand.name}
                </h1>

                {isResultView ? (
                    /* RESULT VIEW (From Email Link) */
                    isSuccess ? (
                        <>
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                            }}>
                                ✓
                            </div>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                marginBottom: '15px',
                                color: '#111',
                            }}>
                                {kn.unsubscribePage.title}
                            </h2>
                            <p style={{
                                fontSize: '16px',
                                lineHeight: 1.6,
                                color: '#666',
                                marginBottom: '30px',
                            }}>
                                {displayMessage || kn.unsubscribePage.successMsg}
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                marginBottom: '15px',
                                color: '#111',
                            }}>
                                {kn.unsubscribePage.title}
                            </h2>
                            <p style={{
                                fontSize: '16px',
                                lineHeight: 1.6,
                                color: '#666',
                                marginBottom: '30px',
                            }}>
                                {displayMessage || kn.unsubscribePage.errorMsg}
                            </p>
                        </>
                    )
                ) : (
                    /* MANUAL FORM VIEW */
                    <>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            marginBottom: '10px',
                            color: '#111',
                        }}>
                            {kn.unsubscribePage.title}
                        </h2>
                        <p style={{
                            fontSize: '15px',
                            lineHeight: 1.6,
                            color: '#666',
                            marginBottom: '30px',
                        }}>
                            {kn.unsubscribePage.description}
                        </p>

                        <form onSubmit={handleManualSubmit} style={{ marginBottom: '30px' }}>
                            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                <label htmlFor="email" style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    textTransform: 'uppercase',
                                    marginBottom: '8px',
                                    fontFamily: 'Arial, sans-serif',
                                    letterSpacing: '0.5px'
                                }}>
                                    {kn.unsubscribePage.emailLabel}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder={kn.unsubscribePage.placeholder}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '16px',
                                        border: '1px solid #ddd',
                                        borderRadius: '0',
                                        fontFamily: 'Arial, sans-serif',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                {formStatus === 'error' && (
                                    <p style={{
                                        color: '#dc2626',
                                        fontSize: '13px',
                                        marginTop: '8px',
                                        textAlign: 'left',
                                        fontFamily: 'Arial, sans-serif'
                                    }}>
                                        {formMessage}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={formStatus === 'loading'}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: '#111',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: formStatus === 'loading' ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Arial, sans-serif',
                                    opacity: formStatus === 'loading' ? 0.7 : 1,
                                }}
                            >
                                {formStatus === 'loading' ? kn.unsubscribePage.processing : kn.unsubscribePage.button}
                            </button>
                        </form>
                    </>
                )}

                <Link
                    href="/"
                    style={{
                        display: 'inline-block',
                        padding: '14px 28px',
                        backgroundColor: isResultView ? '#111' : 'transparent',
                        color: isResultView ? '#fff' : '#666',
                        textDecoration: isResultView ? 'none' : 'underline',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                    }}
                >
                    {kn.unsubscribePage.returnHome}
                </Link>

                {!isResultView && (
                    <p style={{
                        marginTop: '30px',
                        fontSize: '13px',
                        color: '#999',
                        fontFamily: 'Arial, sans-serif',
                    }}>
                        {kn.unsubscribePage.changedMind}{' '}
                        <Link href="/" style={{ color: '#666', textDecoration: 'underline' }}>
                            {kn.unsubscribePage.staySubscribed}
                        </Link>
                    </p>
                )}
            </div>
        </main>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={
            <main style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                padding: '20px',
            }}>
                <div style={{
                    maxWidth: '500px',
                    backgroundColor: '#ffffff',
                    padding: '40px',
                    textAlign: 'center',
                    border: '1px solid #e5e5e5',
                }} aria-hidden="true">
                    {/* Masthead skeleton */}
                    <SkeletonBlock width="160px" height="32px" isHeadline style={{ margin: '0 auto 30px' }} />

                    {/* Heading skeleton */}
                    <SkeletonBlock width="140px" height="24px" isHeadline style={{ margin: '0 auto 15px' }} />

                    {/* Body text skeleton */}
                    <SkeletonBlock width="280px" height="16px" style={{ margin: '0 auto 8px' }} />
                    <SkeletonBlock width="200px" height="16px" style={{ margin: '0 auto 30px' }} />

                    {/* Button skeleton */}
                    <SkeletonBlock width="200px" height="48px" style={{ margin: '0 auto' }} />
                </div>
                <span className="sr-only" role="status" aria-live="polite">
                    Content loading
                </span>
            </main>
        }>
            <UnsubscribeContent />
        </Suspense>
    );
}
