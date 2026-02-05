"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h2 className="font-serif text-3xl font-bold mb-4 text-[#111]">
                Something went wrong
            </h2>
            <p className="font-sans text-base text-[#595959] mb-8 max-w-md">
                We encountered an unexpected issue.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="font-sans text-xs font-bold uppercase tracking-widest border-b border-[#111] pb-1 hover:text-[#595959] hover:border-[#595959] transition-colors"
                >
                    Try Again
                </button>
                <a
                    href="/"
                    className="font-sans text-xs font-bold uppercase tracking-widest border-b border-[#111] pb-1 hover:text-[#595959] hover:border-[#595959] transition-colors"
                >
                    Return Home
                </a>
            </div>
        </div>
    );
}
