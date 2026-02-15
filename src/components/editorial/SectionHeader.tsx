/**
 * SectionHeader Component
 * 
 * Renders the header for a section landing page.
 * Uses the same `section-header` + `section-line` pattern as the homepage
 * for brand consistency, with an editorial description below.
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from 'next/link';

interface SectionHeaderProps {
    /** Display name for the section */
    name: string;
    /** Editorial description of the section */
    description: string;
    /** Total article count (optional, shown as context) */
    articleCount?: number;
}

export function SectionHeader({ name, description, articleCount }: SectionHeaderProps) {
    return (
        <header className="mb-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A]">
                    <li>
                        <Link href="/" className="hover:text-[#111] transition-colors">
                            Home
                        </Link>
                    </li>
                    <li aria-hidden="true">
                        <span className="text-[#D0D0D0]">/</span>
                    </li>
                    <li>
                        <span className="text-[#111]">{name}</span>
                    </li>
                </ol>
            </nav>

            {/* Section Title — editorial style */}
            <div className="section-header flex justify-between items-baseline" style={{ marginBottom: "0.15rem" }}>
                <h1
                    className="section-title"
                    style={{
                        fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                        fontWeight: 800,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.1,
                    }}
                >
                    {name}
                </h1>
                {articleCount !== undefined && articleCount > 0 && (
                    <span className="font-sans text-[11px] font-medium text-[#8A8A8A] tracking-wider uppercase">
                        {articleCount} {articleCount === 1 ? 'Article' : 'Articles'}
                    </span>
                )}
            </div>
            <div className="section-line" aria-hidden="true" style={{ marginBottom: "0.75rem" }} />

            {/* Section Description */}
            {description && (
                <p className="font-sans text-[15px] leading-relaxed text-[#6B6B6B] max-w-2xl">
                    {description}
                </p>
            )}
        </header>
    );
}
