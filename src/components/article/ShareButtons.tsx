/**
 * ShareButtons Component
 * 
 * Provides social sharing functionality with:
 * - WhatsApp
 * - X (Twitter)
 * - Facebook
 * - Copy link
 * 
 * Detects current route and constructs proper absolute URL.
 * Different placement for desktop (sticky floating) and mobile (bottom bar).
 */

'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface ShareButtonsProps {
    /** Article title to share */
    title: string;
    /** Optional description for sharing */
    description?: string;
    /** Optional custom URL (if not provided, uses current path) */
    url?: string;
    /** Variant for different placements */
    variant?: 'floating' | 'inline' | 'bottom-bar';
    /** Additional CSS classes */
    className?: string;
}

// SVG Icons
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

export function ShareButtons({
    title,
    url: customUrl,
    variant = 'inline',
    className = '',
}: ShareButtonsProps) {
    const pathname = usePathname();
    const [copied, setCopied] = useState(false);

    // Build absolute URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thehintnews.in';
    const shareUrl = customUrl || `${siteUrl}${pathname}`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);

    // Share handlers
    const shareToWhatsApp = useCallback(() => {
        const text = `${title} ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }, [title, shareUrl]);

    const shareToX = useCallback(() => {
        window.open(
            `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            '_blank',
            'noopener,noreferrer'
        );
    }, [encodedUrl, encodedTitle]);

    const shareToFacebook = useCallback(() => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
            '_blank',
            'noopener,noreferrer'
        );
    }, [encodedUrl, encodedTitle]);

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [shareUrl]);

    // Button component for reusability
    const ShareButton = ({
        onClick,
        icon: Icon,
        label,
        colorClass,
        hoverClass,
    }: {
        onClick: () => void;
        icon: React.ComponentType;
        label: string;
        colorClass: string;
        hoverClass: string;
    }) => (
        <button
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`
                flex items-center justify-center
                w-10 h-10 rounded-full
                transition-all duration-200
                ${colorClass}
                ${hoverClass}
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50
                active:scale-95
            `}
        >
            <Icon />
        </button>
    );

    // Inline variant - simple horizontal row
    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-xs text-[#6B6B6B] mr-2">Share:</span>
                <ShareButton
                    onClick={shareToWhatsApp}
                    icon={WhatsAppIcon}
                    label="Share on WhatsApp"
                    colorClass="bg-[#25D366] text-white"
                    hoverClass="hover:bg-[#128C7E]"
                />
                <ShareButton
                    onClick={shareToX}
                    icon={XIcon}
                    label="Share on X"
                    colorClass="bg-black text-white"
                    hoverClass="hover:bg-gray-800"
                />
                <ShareButton
                    onClick={shareToFacebook}
                    icon={FacebookIcon}
                    label="Share on Facebook"
                    colorClass="bg-[#1877F2] text-white"
                    hoverClass="hover:bg-[#166fe5]"
                />
                <button
                    onClick={copyToClipboard}
                    aria-label={copied ? 'Link copied!' : 'Copy link'}
                    title={copied ? 'Link copied!' : 'Copy link'}
                    className={`
                        flex items-center justify-center
                        w-10 h-10 rounded-full
                        transition-all duration-200
                        ${copied
                            ? 'bg-green-500 text-white'
                            : 'bg-[#F0F0F0] text-[#6B6B6B] hover:bg-[#E0E0E0]'
                        }
                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50
                        active:scale-95
                    `}
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
            </div>
        );
    }

    // Floating variant - sticky on desktop
    if (variant === 'floating') {
        return (
            <div className={`hidden lg:flex flex-col items-center gap-3 fixed left-4 top-1/2 -translate-y-1/2 z-40 ${className}`}>
                <div className="bg-white rounded-full shadow-lg p-2 border border-[#E0E0E0]">
                    <div className="flex flex-col items-center gap-2">
                        <ShareButton
                            onClick={shareToWhatsApp}
                            icon={WhatsAppIcon}
                            label="Share on WhatsApp"
                            colorClass="bg-[#25D366] text-white"
                            hoverClass="hover:bg-[#128C7E]"
                        />
                        <ShareButton
                            onClick={shareToX}
                            icon={XIcon}
                            label="Share on X"
                            colorClass="bg-black text-white"
                            hoverClass="hover:bg-gray-800"
                        />
                        <ShareButton
                            onClick={shareToFacebook}
                            icon={FacebookIcon}
                            label="Share on Facebook"
                            colorClass="bg-[#1877F2] text-white"
                            hoverClass="hover:bg-[#166fe5]"
                        />
                        <button
                            onClick={copyToClipboard}
                            aria-label={copied ? 'Link copied!' : 'Copy link'}
                            title={copied ? 'Link copied!' : 'Copy link'}
                            className={`
                                flex items-center justify-center
                                w-10 h-10 rounded-full
                                transition-all duration-200
                                ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-[#F0F0F0] text-[#6B6B6B] hover:bg-[#E0E0E0]'
                                }
                                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50
                                active:scale-95
                            `}
                        >
                            {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Bottom bar variant - mobile sticky
    if (variant === 'bottom-bar') {
        return (
            <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] shadow-lg z-50 ${className}`}>
                <div className="flex items-center justify-center gap-6 py-3 px-4">
                    <button
                        onClick={shareToWhatsApp}
                        className="flex items-center gap-2 text-[#25D366] font-medium text-sm"
                    >
                        <WhatsAppIcon />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        onClick={shareToX}
                        className="flex items-center gap-2 text-black font-medium text-sm"
                    >
                        <XIcon />
                        <span>X</span>
                    </button>
                    <button
                        onClick={shareToFacebook}
                        className="flex items-center gap-2 text-[#1877F2] font-medium text-sm"
                    >
                        <FacebookIcon />
                        <span>Facebook</span>
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-2 font-medium text-sm ${copied ? 'text-green-600' : 'text-[#6B6B6B]'}`}
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

export default ShareButtons;