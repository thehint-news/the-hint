/**
 * LeadStory Component
 * 
 * The dominant lead story with maximum visual prominence.
 * ORDER: Section label → Large headline → Hero image → Caption → Date
 * 
 * Headlines visually outweigh images. Images support, never dominate.
 * 
 * NO business logic, NO imports from lib/content.
 */

import Link from "next/link";
import Image from "next/image";
import { formatSafeDate } from "@/lib/utils";

interface LeadStoryProps {
    article: {
        id: string;
        title: string;
        subtitle: string;
        section: string;
        publishedAt: string;
        contentType: string;
        image?: string;
        body?: string;
    } | null;
}

export function LeadStory({ article }: LeadStoryProps) {
    if (!article) {
        return null;
    }

    // Thumbnail is now guaranteed through the data layer (reader.ts)
    // which extracts first body image if no explicit image is set

    const formattedDate = formatSafeDate(article.publishedAt, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const sectionLabel = article.section
        .replace("-", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const articleUrl = `/${article.section}/${article.id}`;

    return (
        <section style={{ marginBottom: "1.25rem" }} aria-labelledby="lead-story-heading">
            <article>
                {/* Section Label */}
                <div style={{ marginBottom: "0.5rem" }}>
                    <span className="section-label">{sectionLabel}</span>
                </div>

                {/* Dominant Headline - Largest on page */}
                <Link href={articleUrl} className="article-link">
                    <h2
                        id="lead-story-heading"
                        className="headline-xl"
                        style={{ marginBottom: "0.5rem", maxWidth: "900px" }}
                    >
                        {article.title}
                    </h2>
                </Link>

                {/* Hero Thumbnail - Large, top-focused, more image visibility */}
                <Link href={articleUrl} className="article-link" style={{ display: "block", marginBottom: "0.5rem" }}>
                    <div className="thumbnail-container">
                        {article.image ? (
                            <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                sizes="(max-width: 1200px) 100vw, 1200px"
                                className="article-thumbnail thumbnail-lead"
                                priority={true}
                            />
                        ) : (
                            <div
                                className="thumbnail-placeholder thumbnail-lead"
                                role="img"
                                aria-label={`Illustration for: ${article.title}`}
                            >
                                <span>Featured Image</span>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Caption/Subtitle - Tight grouping with image */}
                <p className="body-text" style={{ marginBottom: "0.25rem", maxWidth: "800px", fontSize: "14px" }}>
                    {article.subtitle}
                </p>

                {/* Date - Close to caption */}
                <div>
                    <time dateTime={article.publishedAt} className="meta-text">
                        {formattedDate}
                    </time>
                    {article.contentType !== "news" && (
                        <span className="meta-text" style={{ marginLeft: "0.75rem", textTransform: "uppercase", fontWeight: 500 }}>
                            {article.contentType}
                        </span>
                    )}
                </div>
            </article>
        </section>
    );
}
