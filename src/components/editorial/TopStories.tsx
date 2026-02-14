/**
 * TopStories Component
 * 
 * Secondary lead stories below the main lead.
 * Clearly secondary to the lead - smaller images, smaller headlines.
 * Tighter spacing for denser layout.
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from "next/link";
import Image from "next/image";

interface TopStoryArticle {
    id: string;
    title: string;
    subtitle: string;
    section: string;
    publishedAt: string;
    contentType: string;
    image?: string;
}

interface TopStoriesProps {
    articles: TopStoryArticle[];
}

export function TopStories({ articles }: TopStoriesProps) {
    if (articles.length === 0) {
        return null;
    }

    // Take first 2 for secondary leads
    const secondaryLeads = articles.slice(0, 2);

    return (
        <section style={{ marginBottom: "1.25rem" }} aria-labelledby="top-stories-heading">
            {/* Section Header */}
            <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                <h2 id="top-stories-heading" className="section-title">
                    Top Stories
                </h2>
                <div className="section-line" aria-hidden="true" />
            </div>

            {/* Two-Column Layout */}
            <div style={{
                display: "grid",
                gap: "1.25rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}>
                {secondaryLeads.map((article) => {
                    const articleUrl = `/${article.section}/${article.id}`;
                    const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    });

                    return (
                        <article key={article.id} style={{ paddingBottom: "0.75rem" }}>
                            {/* Thumbnail - Larger, more visible */}
                            <Link href={articleUrl} className="article-link" style={{ display: "block", marginBottom: "0.5rem" }}>
                                <div className="thumbnail-container">
                                    {article.image ? (
                                        <Image
                                            src={article.image}
                                            alt={article.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 600px"
                                            className="article-thumbnail thumbnail-top"
                                        />
                                    ) : (
                                        <div
                                            className="thumbnail-placeholder thumbnail-top"
                                            role="img"
                                            aria-label={`Illustration for: ${article.title}`}
                                        >
                                            <span>IMG</span>
                                        </div>
                                    )}
                                </div>
                            </Link>

                            {/* Smaller Headline - Secondary to lead */}
                            <Link href={articleUrl} className="article-link">
                                <h3 className="headline-md" style={{ marginBottom: "0.25rem", lineHeight: 1.25 }}>
                                    {article.title}
                                </h3>
                            </Link>

                            {/* Short Summary - Tight */}
                            <p className="caption-text" style={{
                                marginBottom: "0.25rem",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                            }}>
                                {article.subtitle}
                            </p>

                            {/* Date */}
                            <time dateTime={article.publishedAt} className="meta-text">
                                {formattedDate}
                            </time>
                        </article>
                    );
                })}
            </div>


        </section>
    );
}
