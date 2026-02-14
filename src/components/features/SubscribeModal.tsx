"use client";

import { useState, useRef, useEffect } from "react";

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

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
                setMessage(data.message);
                setEmail("");
                setTimeout(() => {
                    onClose();
                    setStatus("idle");
                    setMessage("");
                }, 2000);
            } else {
                setStatus("error");
                setMessage(data.error || "Something went wrong.");
            }
        } catch {
            setStatus("error");
            setMessage("Failed to connect to server.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#F7F6F2] border border-[#111] shadow-2xl p-8 transform transition-all">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#8A8A8A] hover:text-[#111] transition-colors"
                    aria-label="Close"
                >
                    ✕
                </button>

                <div className="text-center mb-8">
                    <h2 className="font-serif text-3xl font-bold mb-2">The Hint</h2>
                    <p className="text-[#6B6B6B] font-sans text-sm uppercase tracking-widest">
                        Editorial Dispatch
                    </p>
                </div>

                {status === "success" ? (
                    <div className="text-center py-8">
                        <div className="text-2xl mb-2">✓</div>
                        <p className="font-serif text-lg">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-serif text-xl font-medium text-center">
                                Subscribe to our daily briefing
                            </h3>
                            <p className="text-center text-[#6B6B6B] text-sm leading-relaxed px-4">
                                Get the latest stories and editorial analysis delivered straight to your inbox.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="sr-only">Email address</label>
                                <input
                                    ref={inputRef}
                                    type="email"
                                    id="email"
                                    required
                                    placeholder="Enter your email address"
                                    className="w-full bg-white border border-[#D9D9D9] p-3 font-sans text-base focus:border-[#111] focus:outline-none transition-colors placeholder:text-[#8A8A8A]"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "loading"}
                                />
                            </div>

                            {status === "error" && (
                                <p className="text-red-600 text-xs text-center font-medium">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full bg-[#111] text-white font-sans font-bold uppercase tracking-widest text-xs py-4 hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                                {status === "loading" ? "Subscribing..." : "Subscribe"}
                            </button>
                        </div>

                        <p className="text-center text-[10px] text-[#8A8A8A]">
                            No spam. Unsubscribe anytime.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
