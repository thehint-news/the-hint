'use client';

/**
 * Editorial Skeleton Components
 * 
 * DESIGN PHILOSOPHY:
 * These skeletons use the EXACT SAME CSS LAYOUT CLASSES as the production components.
 * By using `container-editorial`, `grid-12`, and `col-span-*`, we ensure
 * pixel-perfect structural alignment.
 * 
 * Heights are calculated based on the font-size tokens in globals.css.
 */

import styles from './EditorialSkeleton.module.css';

// ============================================================================
// BASE PRIMITIVES
// ============================================================================

interface SkeletonBlockProps {
    width?: string;
    height?: string;
    className?: string;
    style?: React.CSSProperties;
    isHeadline?: boolean;
}

/** 
 * Base skeleton block 
 * Uses the same static gray style but accepts strictly typed dimensions 
 */
export function SkeletonBlock({
    width = '100%',
    height = '1rem',
    className = '',
    style = {},
    isHeadline = false
}: SkeletonBlockProps) {
    return (
        <div
            className={`${styles.block} ${isHeadline ? styles.headline : ''} ${className}`}
            style={{ width, height, ...style }}
            aria-hidden="true"
        />
    );
}

// ============================================================================
// COMPONENT SKELETONS (Atomic)
// ============================================================================

/** Matches LeadStory.tsx exactly */
function LeadStorySkeleton() {
    return (
        <section style={{ marginBottom: "1.25rem" }}>
            <article>
                {/* Section Label: "section-label" -> 11px uppercase */}
                <div style={{ marginBottom: "0.5rem" }}>
                    <SkeletonBlock width="40px" height="11px" />
                </div>

                {/* Headline: "headline-xl" -> ~3.5rem max */}
                <div style={{ marginBottom: "0.5rem", maxWidth: "900px" }}>
                    <SkeletonBlock width="100%" height="48px" isHeadline className={styles.headlineXl} />
                    {/* Multi-line simulation for very long headlines */}
                    <div style={{ marginTop: "4px" }}>
                        <SkeletonBlock width="60%" height="48px" isHeadline className={styles.headlineXl} />
                    </div>
                </div>

                {/* Image: "article-image" -> aspect 2.2/1 */}
                <div
                    className={styles.imagePlaceholder}
                    style={{
                        aspectRatio: "2.2/1",
                        width: "100%",
                        maxHeight: "350px",
                        marginBottom: "0.35rem"
                    }}
                />

                {/* Caption: "body-text" small -> ~14px */}
                <div style={{ marginBottom: "0.25rem", maxWidth: "800px" }}>
                    <SkeletonBlock width="80%" height="14px" />
                </div>

                {/* Date: "meta-text" -> 12px */}
                <SkeletonBlock width="120px" height="12px" />
            </article>
        </section>
    );
}

/** Matches TopStories.tsx exactly */
function TopStoriesSkeleton() {
    return (
        <section style={{ marginBottom: "1.25rem" }}>
            {/* Header */}
            <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                <SkeletonBlock width="100px" height="13px" isHeadline />
                <div className="section-line" style={{ backgroundColor: "#E5E5E5" }} />
            </div>

            {/* Grid */}
            <div style={{
                display: "grid",
                gap: "1.25rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}>
                {[0, 1].map((i) => (
                    <article key={i} style={{ paddingBottom: "0.75rem" }}>
                        {/* Image: aspect 16/9 */}
                        <div
                            className={styles.imagePlaceholder}
                            style={{
                                aspectRatio: "16/9",
                                width: "100%",
                                maxHeight: "130px",
                                marginBottom: "0.5rem"
                            }}
                        />
                        {/* Headline: "headline-md" -> ~1.25rem (20px) */}
                        <SkeletonBlock width="95%" height="20px" isHeadline />
                        <div style={{ marginTop: "4px", marginBottom: "0.25rem" }}>
                            <SkeletonBlock width="40%" height="20px" isHeadline />
                        </div>

                        {/* Subtitle: "caption-text" -> 12px (2 lines) */}
                        <SkeletonBlock width="100%" height="12px" />
                        <div style={{ marginTop: "4px", marginBottom: "0.25rem" }}>
                            <SkeletonBlock width="70%" height="12px" />
                        </div>

                        {/* Date */}
                        <SkeletonBlock width="100px" height="12px" />
                    </article>
                ))}
            </div>
        </section>
    );
}

/** Matches SectionBlock.tsx - Layout strategies */
function SectionBlockSkeleton({ title, layout }: { title: string, layout: 'wire' | 'politics' | 'world' | 'opinion' }) {

    // Wire & Politics style items
    const renderListItem = (imgW: number, imgH: number, count: number) => (
        Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: "0.625rem", padding: layout === 'wire' ? "0.35rem 0" : "0.5rem 0" }}>
                <div className={styles.imagePlaceholder} style={{ width: `${imgW}px`, height: `${imgH}px`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    {/* "headline-sm" -> ~15px */}
                    <SkeletonBlock width="90%" height="15px" isHeadline />
                    <div style={{ height: "4px" }} />
                    {/* "caption-text" -> 12px */}
                    <SkeletonBlock width="60%" height="12px" />
                    <div style={{ height: "3px" }} />
                    <SkeletonBlock width="80px" height="11px" />
                </div>
            </div>
        ))
    );

    return (
        <section style={{ marginBottom: "1.25rem" }}>
            <div className="section-header" style={{ marginBottom: layout === 'world' || layout === 'politics' ? "0.5rem" : "0.5rem" }}>
                <SkeletonBlock width={`${title.length * 9}px`} height="13px" isHeadline />
                <div className="section-line" style={{ backgroundColor: "#E5E5E5" }} />
            </div>

            {layout === 'wire' && <div>{renderListItem(50, 40, 5)}</div>}

            {layout === 'politics' && <div>{renderListItem(60, 40, 4)}</div>}

            {layout === 'world' && (
                <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
                    {[0, 1].map(i => (
                        <article key={i} style={{ paddingBottom: "0.5rem" }}>
                            {/* Image aspect 16/10 */}
                            <div className={styles.imagePlaceholder} style={{ aspectRatio: "16/10", width: "100%", marginBottom: "0.625rem" }} />
                            <SkeletonBlock width="95%" height="16px" isHeadline />
                            <div style={{ height: "4px" }} />
                            <SkeletonBlock width="100%" height="13px" />
                            <div style={{ height: "4px" }} />
                            <SkeletonBlock width="80px" height="11px" />
                        </article>
                    ))}
                </div>
            )}

            {layout === 'opinion' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
                    {[0, 1, 2, 3].map(i => (
                        <article key={i} style={{ display: "flex", flexDirection: "column" }}>
                            {/* Thumbnail: 16:9 aspect ratio */}
                            <div
                                className={styles.imagePlaceholder}
                                style={{ aspectRatio: "16/9", width: "100%", marginBottom: "0.625rem" }}
                            />
                            {/* Author name */}
                            <SkeletonBlock width="60%" height="11px" style={{ marginBottom: "0.25rem" }} />
                            {/* Headline */}
                            <SkeletonBlock width="95%" height="15px" isHeadline style={{ marginBottom: "0.2rem" }} />
                            <SkeletonBlock width="70%" height="15px" isHeadline style={{ marginBottom: "0.35rem" }} />
                            {/* Excerpt */}
                            <SkeletonBlock width="100%" height="12px" style={{ marginBottom: "0.15rem" }} />
                            <SkeletonBlock width="80%" height="12px" style={{ marginBottom: "0.35rem" }} />
                            {/* Date */}
                            <SkeletonBlock width="80px" height="11px" />
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

// ============================================================================
// PAGE SKELETONS - The full page assemblies
// ============================================================================

export function HomepageSkeleton() {
    return (
        <main id="main-content" className="flex-1" aria-hidden="true">
            <span className={styles.srOnly}>Loading homepage...</span>

            <div className="container-editorial" style={{ paddingTop: "1rem", paddingBottom: "1.5rem" }}>
                <LeadStorySkeleton />
            </div>

            <hr className="full-width-divider" />

            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <TopStoriesSkeleton />
            </div>

            <hr className="full-width-divider" />

            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <div className="grid-12">
                    <div className="col-span-6">
                        <SectionBlockSkeleton title="Crime" layout="wire" />
                    </div>
                    <div className="col-span-6">
                        <SectionBlockSkeleton title="Court" layout="wire" />
                    </div>
                </div>
            </div>

            <hr className="full-width-divider" />

            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <div className="grid-12">
                    <div className="col-span-6">
                        <SectionBlockSkeleton title="Politics" layout="politics" />
                    </div>
                    <div className="col-span-6">
                        <SectionBlockSkeleton title="World Affairs" layout="world" />
                    </div>
                </div>
            </div>

            <hr className="full-width-divider" />

            <div className="container-editorial" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
                <SectionBlockSkeleton title="Opinion & Analysis" layout="opinion" />
            </div>
        </main>
    );
}

export function SectionPageSkeleton() {
    return (
        <main id="main-content" className="flex-1" aria-hidden="true">
            <span className={styles.srOnly}>Loading section...</span>

            {/* Section Header */}
            <div className="container-editorial" style={{ paddingTop: "2rem", paddingBottom: "0.5rem" }}>
                <header style={{ marginBottom: "2.5rem" }}>
                    {/* Breadcrumb */}
                    <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <SkeletonBlock width="35px" height="11px" />
                        <SkeletonBlock width="6px" height="11px" />
                        <SkeletonBlock width="60px" height="11px" />
                    </div>

                    {/* Section Title + Article Count */}
                    <div className="section-header flex justify-between items-baseline" style={{ marginBottom: "0.15rem" }}>
                        <SkeletonBlock width="200px" height="36px" isHeadline />
                        <SkeletonBlock width="80px" height="11px" />
                    </div>
                    <div className="section-line" style={{ backgroundColor: "#E5E5E5" }} />

                    {/* Description */}
                    <div style={{ marginTop: "0.75rem" }}>
                        <SkeletonBlock width="80%" height="15px" />
                        <div style={{ height: "5px" }} />
                        <SkeletonBlock width="50%" height="15px" />
                    </div>
                </header>
            </div>

            {/* Lead Story */}
            <div className="container-editorial" style={{ paddingBottom: "1rem" }}>
                <LeadStorySkeleton />
            </div>

            {/* Divider */}
            <hr className="full-width-divider" />

            {/* Story List */}
            <div className="container-editorial" style={{ paddingTop: "1.5rem" }}>
                <div style={{ marginBottom: "3rem" }}>
                    <div className="flex flex-col">
                        {[0, 1, 2, 3, 4].map((_, i) => (
                            <article
                                key={i}
                                style={{
                                    display: "flex",
                                    gap: "1.5rem",
                                    paddingTop: "1.5rem",
                                    paddingBottom: "1.5rem",
                                    borderBottom: i < 4 ? "1px solid #E5E5E5" : "none"
                                }}
                            >
                                {/* Thumbnail: 200px, 3:2 */}
                                <div
                                    className={styles.imagePlaceholder}
                                    style={{ width: "200px", aspectRatio: "3/2", flexShrink: 0 }}
                                />

                                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                    {/* Headline */}
                                    <SkeletonBlock width="90%" height="20px" isHeadline />
                                    <div style={{ height: "4px" }} />
                                    <SkeletonBlock width="60%" height="20px" isHeadline />
                                    <div style={{ height: "8px" }} />
                                    {/* Subtitle */}
                                    <SkeletonBlock width="100%" height="13px" />
                                    <div style={{ height: "4px" }} />
                                    <SkeletonBlock width="75%" height="13px" />
                                    <div style={{ height: "8px" }} />
                                    {/* Meta */}
                                    <SkeletonBlock width="130px" height="11px" />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pagination skeleton */}
            <div className="container-editorial" style={{ paddingBottom: "3rem" }}>
                <div
                    style={{
                        paddingTop: "2rem",
                        marginTop: "2rem",
                        borderTop: "1px solid #111",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <SkeletonBlock width="180px" height="12px" />
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                        <SkeletonBlock width="30px" height="28px" />
                        <SkeletonBlock width="30px" height="28px" />
                        <SkeletonBlock width="30px" height="28px" />
                        <SkeletonBlock width="30px" height="28px" />
                    </div>
                </div>
            </div>
        </main>
    );
}

/**
 * Simulates real paragraph text using "word blocks"
 * Creates a "ragged right" look with varied line lengths and word gaps.
 * Uses deterministic patterns to prevent hydration mismatches.
 */
function SkeletonParagraph({ lines = 4 }: { lines?: number }) {
    // Deterministic word length patterns (in percentage of line or fixed width)
    const wordPatterns = [
        ['60px', '40px', '80px', '50px', '30px', '70px', '40px'],
        ['50px', '70px', '30px', '60px', '40px', '60px'],
        ['70px', '30px', '80px', '40px', '50px'],
        ['40px', '60px', '30px', '50px'] // Shorter last line
    ];

    return (
        <div style={{ marginBottom: "1.5rem" }} aria-hidden="true">
            {Array.from({ length: lines }).map((_, lineIndex) => {
                // Cycle through patterns based on line index
                const words = wordPatterns[lineIndex % wordPatterns.length];

                return (
                    <div key={lineIndex} style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginBottom: '0.6rem', // Line spacing
                        alignItems: 'center'
                    }}>
                        {words.map((width, wordIndex) => (
                            <SkeletonBlock
                                key={wordIndex}
                                width={width}
                                height="14px" // x-height of the font
                                style={{ borderRadius: '2px' }}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

export function ArticlePageSkeleton() {
    return (
        <main className="px-6 py-12 max-w-[1200px] mx-auto" aria-hidden="true">
            <span className={styles.srOnly}>Loading article...</span>
            <article>
                <div className="max-w-4xl mx-auto">
                    <header className="mb-6">
                        {/* Section Label */}
                        <div className="mb-3 flex items-center gap-4">
                            <SkeletonBlock width="60px" height="12px" />
                        </div>
                        {/* Headline: text-4xl/5xl -> Simulated with words */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 max-w-[900px]">
                            <SkeletonBlock width="180px" height="48px" isHeadline className={styles.headlineXl} />
                            <SkeletonBlock width="120px" height="48px" isHeadline className={styles.headlineXl} />
                            <SkeletonBlock width="200px" height="48px" isHeadline className={styles.headlineXl} />
                            <SkeletonBlock width="140px" height="48px" isHeadline className={styles.headlineXl} />
                            <SkeletonBlock width="160px" height="48px" isHeadline className={styles.headlineXl} />
                            <SkeletonBlock width="100px" height="48px" isHeadline className={styles.headlineXl} />
                        </div>

                        {/* Subheadline: text-xl -> Simulated with words */}
                        <div className="flex flex-wrap gap-x-3 gap-y-2 mb-8 max-w-[700px]">
                            <SkeletonBlock width="100px" height="20px" />
                            <SkeletonBlock width="80px" height="20px" />
                            <SkeletonBlock width="120px" height="20px" />
                            <SkeletonBlock width="60px" height="20px" />
                            <SkeletonBlock width="90px" height="20px" />
                            <SkeletonBlock width="140px" height="20px" />
                            <SkeletonBlock width="70px" height="20px" />
                        </div>

                        {/* Meta Row */}
                        <SkeletonBlock width="250px" height="14px" />
                        <div style={{ height: "24px" }} />

                        <hr className="border-t border-[#D9D9D9] w-full" />
                    </header>
                </div>

                <figure className="mb-10 max-w-4xl mx-auto">
                    <div className={styles.imagePlaceholder} style={{ width: "100%", maxHeight: "500px", aspectRatio: "16/9" }} />
                </figure>

                {/* Body: max-w-[68ch] - Using Word Simulation */}
                <div className="max-w-[68ch] mx-auto">
                    <SkeletonParagraph lines={5} />
                    <SkeletonParagraph lines={4} />
                    <SkeletonParagraph lines={6} />
                    <SkeletonParagraph lines={3} />
                </div>
            </article>
        </main>
    );
}

// ... Keep Publish and Database skeletons as they were (they were correct) ...
export function PublishPageSkeleton() {
    return (
        <div className="min-h-screen bg-[#f5f5f0]" aria-hidden="true">
            <span className={styles.srOnly} role="status">Content loading</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <SkeletonBlock width="100px" height="32px" />
                    <SkeletonBlock width="100px" height="32px" />
                    <SkeletonBlock width="60px" height="32px" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <SkeletonBlock width="90px" height="32px" />
                    <SkeletonBlock width="70px" height="32px" />
                </div>
            </div>
            <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
                <div style={{ flex: 1, padding: '2rem 3rem', maxWidth: '800px' }}>
                    <SkeletonBlock width="70%" height="42px" isHeadline />
                    <div style={{ marginBottom: '1rem' }} />
                    <SkeletonBlock width="50%" height="24px" />
                    <div style={{ marginBottom: '2rem' }} />
                    <div style={{ border: '1px dashed #d0d0d0', padding: '2rem', minHeight: '300px' }}>
                        <SkeletonBlock width="120px" height="16px" />
                    </div>
                </div>
                <div style={{ width: '320px', borderLeft: '1px solid #e0e0e0', padding: '1.5rem', backgroundColor: '#fafafa' }}>
                    <SkeletonBlock width="100%" height="40px" style={{ marginBottom: "1rem" }} />
                    <SkeletonBlock width="100%" height="40px" style={{ marginBottom: "1rem" }} />
                </div>
            </div>
        </div>
    );
}

export function ArticleDatabaseSkeleton() {
    return (
        <div aria-hidden="true">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 150px', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                <SkeletonBlock width="50px" height="14px" />
                <SkeletonBlock width="60px" height="14px" />
                <SkeletonBlock width="50px" height="14px" />
                <SkeletonBlock width="70px" height="14px" />
                <SkeletonBlock width="80px" height="14px" />
                <SkeletonBlock width="70px" height="14px" />
                <SkeletonBlock width="60px" height="14px" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 150px', gap: '1rem', padding: '0.875rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
                    <SkeletonBlock width={`${70 + (i % 3) * 10}%`} height="16px" isHeadline />
                    <SkeletonBlock width="60px" height="14px" />
                    <SkeletonBlock width="70px" height="14px" />
                    <SkeletonBlock width="40px" height="14px" />
                    <SkeletonBlock width="90px" height="14px" />
                    <SkeletonBlock width="90px" height="14px" />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <SkeletonBlock width="35px" height="24px" />
                        <SkeletonBlock width="45px" height="24px" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SlowLoadingHint({ message = "Still loading..." }: { message?: string }) {
    return <div className={styles.slowHint} role="status">{message}</div>;
}
