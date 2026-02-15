/**
 * SectionBlock Component
 * 
 * Section-specific layouts with increased density:
 * 
 * CRIME & COURT: Wire/docket style - smaller thumbnails, headline only, dense list
 * POLITICS: Dense list-driven - smaller images, headlines emphasized
 * WORLD AFFAIRS: Image-led but controlled - slightly more spacing
 * OPINION: Serious analytical tone - stronger headlines, reduced whitespace
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from "next/link";
import Image from "next/image";

interface SectionArticle {
    id: string;
    title: string;
    subtitle: string;
    section?: string;
    publishedAt: string;
    contentType: string;
    image?: string;
}

interface SectionBlockProps {
    sectionTitle: string;
    articles: SectionArticle[];
}

// Wire-style layout for Crime and Court - Dense with heading, sub-headline, date
function WireStyleLayout({ articles, sectionSlug }: { articles: SectionArticle[]; sectionSlug: string }) {
    return (
        <div>
            {articles.slice(0, 5).map((article) => {
                const articleUrl = `/${sectionSlug}/${article.id}`;
                const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                });

                return (
                    <Link key={article.id} href={articleUrl} className="article-link">
                        <div style={{
                            display: "flex",
                            gap: "0.625rem",
                            padding: "0.35rem 0"
                        }}>
                            {/* Small Thumbnail - Wire style */}
                            {article.image ? (
                                <div className="thumbnail-container thumbnail-wire">
                                    <Image
                                        src={article.image}
                                        alt={article.title}
                                        width={80}
                                        height={56}
                                        className="article-thumbnail thumbnail-wire"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="thumbnail-placeholder thumbnail-wire"
                                    role="img"
                                    aria-label={`Thumbnail for: ${article.title}`}
                                >
                                    IMG
                                </div>
                            )}

                            {/* Content: Heading, Sub-headline, Date */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Heading */}
                                <h3 className="headline-sm" style={{
                                    marginBottom: "0.25rem",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    fontSize: "0.875rem",
                                    lineHeight: 1.3
                                }}>
                                    {article.title}
                                </h3>

                                {/* Sub-headline - 1 line */}
                                <p className="caption-text" style={{
                                    marginBottom: "0.125rem",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    fontSize: "12px",
                                    lineHeight: 1.4
                                }}>
                                    {article.subtitle}
                                </p>

                                {/* Date */}
                                <time className="meta-text" style={{ fontSize: "11px" }}>
                                    {formattedDate}
                                </time>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

// Dense vertical list for Politics
function PoliticsLayout({ articles, sectionSlug }: { articles: SectionArticle[]; sectionSlug: string }) {
    return (
        <div>
            {articles.slice(0, 4).map((article) => {
                const articleUrl = `/${sectionSlug}/${article.id}`;
                const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                });

                return (
                    <Link key={article.id} href={articleUrl} className="article-link">
                        <div style={{
                            display: "flex",
                            gap: "0.625rem",
                            padding: "0.5rem 0"
                        }}>
                            {/* Small Thumbnail - Politics style */}
                            {article.image ? (
                                <div className="thumbnail-container thumbnail-politics">
                                    <Image
                                        src={article.image}
                                        alt={article.title}
                                        width={90}
                                        height={65}
                                        className="article-thumbnail thumbnail-politics"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="thumbnail-placeholder thumbnail-politics"
                                    role="img"
                                    aria-label={`Thumbnail for: ${article.title}`}
                                >
                                    IMG
                                </div>
                            )}

                            {/* Headline, Subtitles, Date */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 className="headline-sm" style={{
                                    marginBottom: "0.25rem",
                                    fontSize: "0.875rem",
                                    lineHeight: 1.3
                                }}>
                                    {article.title}
                                </h3>

                                {/* Sub-headline */}
                                <p className="caption-text" style={{
                                    marginBottom: "0.125rem",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    fontSize: "12px",
                                    lineHeight: 1.4
                                }}>
                                    {article.subtitle}
                                </p>

                                {/* Date */}
                                <time className="meta-text" style={{ fontSize: "11px" }}>
                                    {formattedDate}
                                </time>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

// Image-led layout for World Affairs - Slightly more breathing room
// Image-led layout for World Affairs - Only 2 articles
function WorldAffairsLayout({ articles, sectionSlug }: { articles: SectionArticle[]; sectionSlug: string }) {
    return (
        <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
            {articles.slice(0, 2).map((article) => {
                const articleUrl = `/${sectionSlug}/${article.id}`;
                const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                });

                return (
                    <Link key={article.id} href={articleUrl} className="article-link">
                        <article style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
                            {/* Thumbnail - World Affairs style */}
                            <div className="thumbnail-container" style={{ marginBottom: "0.625rem" }}>
                                {article.image ? (
                                    <Image
                                        src={article.image}
                                        alt={article.title}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 400px"
                                        className="article-thumbnail thumbnail-world"
                                    />
                                ) : (
                                    <div
                                        className="thumbnail-placeholder thumbnail-world"
                                        role="img"
                                        aria-label={`Illustration for: ${article.title}`}
                                    >
                                        IMG
                                    </div>
                                )}
                            </div>

                            {/* Headline */}
                            <h3 className="headline-sm" style={{
                                marginBottom: "0.25rem",
                                lineHeight: 1.3,
                                fontSize: "1rem"
                            }}>
                                {article.title}
                            </h3>

                            {/* Sub-headline */}
                            <p className="caption-text" style={{
                                marginBottom: "0.25rem",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                fontSize: "13px",
                                lineHeight: 1.4
                            }}>
                                {article.subtitle}
                            </p>

                            {/* Date */}
                            <time className="meta-text" style={{ fontSize: "11px" }}>
                                {formattedDate}
                            </time>
                        </article>
                    </Link>
                );
            })}
        </div>
    );
}

// Opinion layout - Consistent with global design guidelines
function OpinionLayout({ articles, sectionSlug }: { articles: SectionArticle[]; sectionSlug: string }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
            {articles.slice(0, 4).map((article) => {
                const articleUrl = `/${sectionSlug}/${article.id}`;
                let authorName = "";
                let excerpt = article.subtitle;

                if (article.subtitle.includes("—")) {
                    const parts = article.subtitle.split("—");
                    authorName = parts[0].trim();
                    excerpt = parts[1]?.trim() || "";
                }

                const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                });

                return (
                    <Link key={article.id} href={articleUrl} className="article-link group block h-full">
                        <article className="flex flex-col h-full">
                            {/* Image Container */}
                            <div className="thumbnail-container mb-2.5 aspect-[16/9] w-full">
                                {article.image ? (
                                    <Image
                                        src={article.image}
                                        alt={article.title}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 300px"
                                        className="article-thumbnail thumbnail-world w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="thumbnail-placeholder thumbnail-world w-full h-full"
                                        role="img"
                                        aria-label={`Thumbnail for: ${article.title}`}
                                    >
                                        IMG
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex flex-col min-w-0 flex-grow">
                                {/* Author (Opinion specific) */}
                                {authorName && (
                                    <span className="meta-text text-ink font-medium mb-1 block truncate">
                                        {authorName}
                                    </span>
                                )}

                                {/* Headline - using global class */}
                                <h3 className="headline-sm mb-1 line-clamp-3">
                                    {article.title}
                                </h3>

                                {/* Excerpt - Desktop only */}
                                {excerpt && (
                                    <p className="caption-text hidden md:block mb-2 line-clamp-3">
                                        {excerpt}
                                    </p>
                                )}

                                {/* Meta Group */}
                                <div className="mt-auto flex flex-col gap-0.5">
                                    <time className="meta-text">
                                        {formattedDate}
                                    </time>
                                </div>
                            </div>
                        </article>
                    </Link>
                );
            })}
        </div>
    );
}

export function SectionBlock({ sectionTitle, articles }: SectionBlockProps) {
    if (articles.length === 0) {
        return null;
    }

    // Determine section slug for URLs
    const sectionSlug = sectionTitle.toLowerCase().replace(/\s+&?\s*/g, "-").replace("--", "-");

    // Map display names to actual slugs
    const slugMap: Record<string, string> = {
        "crime": "crime",
        "court": "court",
        "politics": "politics",
        "world-affairs": "world-affairs",
        "opinion-analysis": "opinion",
    };

    const actualSlug = slugMap[sectionSlug] || sectionSlug;

    // Determine layout based on section
    const isOpinion = sectionTitle.toLowerCase().includes("opinion");
    const isCrimeOrCourt = ["crime", "court"].includes(sectionSlug);
    const isPolitics = sectionSlug === "politics";
    const isWorldAffairs = sectionSlug.includes("world");

    return (
        <section style={{ marginBottom: "1.25rem" }} aria-labelledby={`section-${sectionSlug}`}>
            {/* Section Header - Prominent label */}
            <div className="section-header flex justify-between items-baseline" style={{ marginBottom: "0.15rem" }}>
                <Link href={`/${actualSlug}`} className="group">
                    <h2 id={`section-${sectionSlug}`} className="section-title group-hover:underline decoration-2 underline-offset-4 decoration-[#111]" style={{ fontWeight: 700 }}>
                        {sectionTitle}
                    </h2>
                </Link>
                <Link href={`/${actualSlug}`} className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#8A8A8A] hover:text-[#111]">
                    View All
                </Link>
            </div>
            <div className="section-line" aria-hidden="true" style={{ marginBottom: "1rem" }} />


            {/* Section Content */}
            {isOpinion && <OpinionLayout articles={articles} sectionSlug={actualSlug} />}
            {isCrimeOrCourt && <WireStyleLayout articles={articles} sectionSlug={actualSlug} />}
            {isPolitics && <PoliticsLayout articles={articles} sectionSlug={actualSlug} />}
            {isWorldAffairs && <WorldAffairsLayout articles={articles} sectionSlug={actualSlug} />}


        </section>
    );
}
