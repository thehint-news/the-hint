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

    // Helper to extract first image from markdown body if featured image is missing
    // Helper to extract first image from markdown body if featured image is missing
    const getFirstBodyImage = (body: string) => {
        // Match custom :::image block syntax
        const customBlockMatch = body.match(/:::image[\s\S]*?src:\s*([^\s]+)/);
        if (customBlockMatch && customBlockMatch[1]) return customBlockMatch[1].trim();

        // Match Markdown image syntax ![alt](url)
        const markdownMatch = body.match(/!\[.*?\]\((.*?)\)/);
        if (markdownMatch && markdownMatch[1]) return markdownMatch[1];

        // Match HTML image syntax <img src="url" />
        const htmlMatch = body.match(/<img[^>]+src=["'](.*?)["']/);
        if (htmlMatch && htmlMatch[1]) return htmlMatch[1];

        return undefined;
    };

    // Use featured image or fallback to first image in body
    const displayImage = article.image || (article.body ? getFirstBodyImage(article.body) : undefined);

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

                {/* Hero Image - Taller for front-page presence */}
                <Link href={articleUrl} className="article-link" style={{ display: "block", marginBottom: "0.35rem" }}>
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={article.title}
                            className="article-image"
                            style={{
                                aspectRatio: "2.2/1",
                                width: "100%",
                                maxHeight: "350px",
                                objectFit: "cover"
                            }}
                        />
                    ) : (
                        <div
                            className="image-placeholder article-image"
                            style={{
                                aspectRatio: "2.2/1",
                                width: "100%",
                                maxHeight: "350px"
                            }}
                            role="img"
                            aria-label={`Illustration for: ${article.title}`}
                        >
                            <span>Editorial Image</span>
                        </div>
                    )}
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
