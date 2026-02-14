"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
    ErrorCodes,
    SuccessCodes,
    getErrorMessage,
    getSuccessMessage,
    logger,
} from '@/lib/feedback';

const STORAGE_KEY_DISMISSED = "thehint-subscribe-dismissed";
const STORAGE_KEY_SUBSCRIBED = "thehint-subscribe-completed";
export function SubscribePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const popupRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Check visibility conditions
    useEffect(() => {
        // Condition: Do NOT show on publish or newsroom pages
        if (pathname?.startsWith("/publish") || pathname?.startsWith("/newsroom")) return;

        // Condition: User has already subscribed - NEVER show again
        if (localStorage.getItem(STORAGE_KEY_SUBSCRIBED)) return;

        // Condition: User has dismissed in the last 8 seconds
        const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
        if (dismissedAt) {
            const date = new Date(dismissedAt);
            const now = new Date();
            const diffSeconds = (now.getTime() - date.getTime()) / 1000;
            if (diffSeconds < 8) return;
        }

        // Triggers
        const showPopup = () => {
            setIsOpen(true);
        };

        // 1. Time Trigger: 8 seconds (per user request "every 8 seconds")
        const timer = setTimeout(showPopup, 8000);

        // 2. Scroll Trigger: 35-40% scroll (Keeping as alternative trigger)
        const handleScroll = () => {
            const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercentage >= 35) {
                showPopup();
                window.removeEventListener("scroll", handleScroll);
                clearTimeout(timer);
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [pathname]);

    // Focus Lock for Accessibility
    useEffect(() => {
        if (isOpen && popupRef.current) {
            const focusableElements = popupRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTab = (e: KeyboardEvent) => {
                if (e.key === "Tab") {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };

            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === "Escape") handleDismiss();
            };

            window.addEventListener("keydown", handleTab);
            window.addEventListener("keydown", handleEsc);

            firstElement?.focus();

            return () => {
                window.removeEventListener("keydown", handleTab);
                window.removeEventListener("keydown", handleEsc);
            };
        }
    }, [isOpen]);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY_DISMISSED, new Date().toISOString());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStatus("success");
                setMessage(getSuccessMessage(SuccessCodes.SUBSCRIPTION_SUCCESS).message);
                // Mark as subscribed permanently - popup will never show again
                localStorage.setItem(STORAGE_KEY_SUBSCRIBED, "true");
                setTimeout(() => {
                    handleDismiss();
                }, 3000);
            } else {
                setStatus("error");
                // Use editorial translation for error
                const errorMsg = data.error?.includes('already')
                    ? getErrorMessage(ErrorCodes.SUBSCRIPTION_ALREADY_EXISTS).message
                    : getErrorMessage(ErrorCodes.SUBSCRIPTION_INVALID_EMAIL).message;
                setMessage(errorMsg);
            }
        } catch (error) {
            logger.error('Subscription failed', error);
            setStatus("error");
            setMessage(getErrorMessage(ErrorCodes.NETWORK_REQUEST_FAILED).message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out"
                onClick={handleDismiss}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                ref={popupRef}
                className="relative w-full max-w-[520px] bg-white rounded-md shadow-xl overflow-hidden animate-fade-in-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-title"
                style={{
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                }}
            >
                {/* Background Visual Layer */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] bg-no-repeat bg-cover bg-center grayscale"
                    style={{ backgroundImage: "url('/images/newsroom-bg.png')" }}
                />

                {/* Content Container */}
                <div className="relative z-10 p-8 md:p-10 flex flex-col items-center text-center">

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-[#8A8A8A] hover:text-[#111] transition-colors p-2"
                        aria-label="Close popup"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    {/* 1. Headline */}
                    <h2 id="popup-title" className="font-serif text-2xl md:text-3xl font-bold text-[#111] mb-2 leading-tight">
                        Independent journalism, delivered as it happens.
                    </h2>

                    {/* 2. Subheadline */}
                    <p className="font-sans text-[#6B6B6B] text-[15px] mb-8 max-w-sm leading-relaxed">
                        Subscribe to receive breaking stories, investigations, and analysis — straight from the newsroom.
                    </p>

                    {/* 3. Editorial Value Points */}
                    <ul className="text-left space-y-2 mb-8 font-sans text-[#333] text-sm md:text-[15px] mx-auto">
                        <li className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8A8A8A]"></span>
                            Breaking news alerts from our editors
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8A8A8A]"></span>
                            In-depth reporting and analysis
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8A8A8A]"></span>
                            No ads. No noise. Just journalism
                        </li>
                    </ul>

                    {/* 4. Email Capture CTA */}
                    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
                        {status === "success" ? (
                            <div className="py-4 px-6 bg-[#F7F6F2] rounded border border-[#E5E5E5] text-green-800 font-medium text-sm">
                                {message}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    <label htmlFor="popup-email" className="sr-only">Email address</label>
                                    <input
                                        type="email"
                                        id="popup-email"
                                        required
                                        placeholder="Enter your email"
                                        className="w-full bg-[#FAFAFA] border border-[#D9D9D9] p-3 rounded font-sans text-base focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all placeholder:text-[#8A8A8A]"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={status === "loading"}
                                    />
                                    {status === "error" && (
                                        <p className="text-red-700 text-xs text-left">{message}</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === "loading"}
                                    className="w-full bg-[#111] text-white font-sans font-bold uppercase tracking-widest text-xs py-3.5 rounded hover:bg-[#333] transition-colors disabled:opacity-50"
                                >
                                    {status === "loading" ? "Subscribing…" : "Subscribe"}
                                </button>
                            </>
                        )}
                    </form>

                    {/* Footer / Disclaimer */}
                    <div className="mt-4 space-y-2">
                        <p className="text-[11px] text-[#8A8A8A]">
                            We respect your inbox. Unsubscribe anytime.
                        </p>
                        <button
                            onClick={handleDismiss}
                            className="text-[12px] text-[#6B6B6B] hover:text-[#111] underline underline-offset-2 decoration-1"
                        >
                            No thanks
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
