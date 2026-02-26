'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageViewTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

        // Only run in production and if GA is configured
        if (process.env.NODE_ENV !== 'production' || !GA_ID) {
            return;
        }

        const timer = setTimeout(() => {
            if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
                (window as any).gtag('config', GA_ID, {
                    page_path: pathname,
                });
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [pathname]);

    return null;
}
