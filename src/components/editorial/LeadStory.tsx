/**
 * LeadStory Component
 * 
 * The dominant lead story with maximum visual prominence.
 * Now supports multi-thumbnail carousel (max 3 images).
 * 
 * Features:
 * - Auto-rotating carousel (5 second interval)
 * - Pause on hover
 * - CSS transform transitions (no heavy JS libraries)
 * - Server-rendered with Next Image optimization
 * - Preloads first image, lazy loads others
 * - Fallback to featuredImage if no leadMedia
 * 
 * ORDER: Section label → Large headline → Hero image/carousel → Caption → Date
 * 
 * Headlines visually outweigh images. Images support, never dominate.
 * 
 * NO business logic, NO imports from lib/content.
 */

'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { kn } from "@/lib/i18n/kn";

/** Single lead story image */
interface LeadStoryImage {
    url: string;
    alt: string;
    width?: number;
    height?: number;
}

/** Lead story article data */
interface LeadStoryArticle {
    id: string;
    title: string;
    subtitle: string;
    section: string;
    publishedAt: string;
    contentType: string;
    image?: string;
    body?: string;
    /** Lead media carousel images */
    leadMedia?: {
        images: LeadStoryImage[];
    };
}

interface LeadStoryProps {
    article: LeadStoryArticle | null;
}

/** Auto-rotate interval in milliseconds */
const ROTATION_INTERVAL = 5000;

/**
 * LeadStory Component
 * 
 * Renders the homepage lead story with optional carousel support.
 * If leadMedia has 2-3 images → renders auto-rotating carousel
 * If leadMedia has 1 image → renders static hero
 * If no leadMedia → falls back to featuredImage
 */
export function LeadStory({ article }: LeadStoryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    if (!article) {
        return null;
    }

    // Determine if we should use carousel or static image
    const leadImages = article.leadMedia?.images || [];
    const useCarousel = leadImages.length >= 2;
    const displayImages = leadImages.length > 0 ? leadImages :
        article.image ? [{ url: article.image, alt: article.title }] : [];

    // Thumbnail is now guaranteed through the data layer (reader.ts)
    // which extracts first body image if no explicit image is set

    const formattedDate = new Date(article.publishedAt).toLocaleDateString("kn-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const sectionLabel = (kn.sections as Record<string, string>)[article.section] || article.section
        .replace("-", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const contentTypeStr = (kn.contentTypes as Record<string, string>)[article.contentType] || article.contentType;

    const articleUrl = `/${article.section}/${article.id}`;

    /**
     * Auto-rotation effect
     */
    useEffect(() => {
        if (!useCarousel || isPaused) {
            return;
        }

        intervalRef.current = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % displayImages.length);
                setIsTransitioning(false);
            }, 50);
        }, ROTATION_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [useCarousel, isPaused, displayImages.length]);

    /**
     * Handle manual navigation
     */
    const goToSlide = useCallback((index: number) => {
        if (index === currentIndex || isTransitioning) return;

        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsTransitioning(false);
        }, 50);
    }, [currentIndex, isTransitioning]);

    const handlePrev = useCallback(() => {
        const newIndex = currentIndex === 0 ? displayImages.length - 1 : currentIndex - 1;
        goToSlide(newIndex);
    }, [currentIndex, displayImages.length, goToSlide]);

    const handleNext = useCallback(() => {
        const newIndex = (currentIndex + 1) % displayImages.length;
        goToSlide(newIndex);
    }, [currentIndex, displayImages.length, goToSlide]);

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
                        style={{ marginBottom: "1.25rem", maxWidth: "900px" }}
                    >
                        {article.title}
                    </h2>
                </Link>

                {/* Hero Thumbnail - Large, top-focused, more image visibility */}
                <Link href={articleUrl} className="article-link" style={{ display: "block", marginBottom: "1.25rem" }}>
                    <div
                        className="thumbnail-container"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                    >
                        {displayImages.length > 0 ? (
                            <div className="lead-carousel">
                                {/* Carousel track */}
                                <div
                                    className="carousel-track"
                                    style={{
                                        transform: `translateX(-${currentIndex * 100}%)`,
                                        transition: isTransitioning ? 'transform 0.5s ease-out' : 'none',
                                    }}
                                >
                                    {displayImages.map((img, index) => (
                                        <div
                                            key={`${img.url}-${index}`}
                                            className="carousel-slide"
                                        >
                                            <Image
                                                src={img.url}
                                                alt={img.alt}
                                                fill
                                                sizes="(max-width: 1200px) 100vw, 1200px"
                                                className="article-thumbnail thumbnail-lead"
                                                priority={index === 0} // Only first image gets priority
                                                loading={index === 0 ? 'eager' : 'lazy'}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Carousel navigation - only show for multiple images */}
                                {useCarousel && (
                                    <>
                                        {/* Navigation arrows */}
                                        <button
                                            type="button"
                                            className="carousel-nav carousel-prev"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handlePrev();
                                            }}
                                            aria-label="Previous image"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="15 18 9 12 15 6" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="carousel-nav carousel-next"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleNext();
                                            }}
                                            aria-label="Next image"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>

                                        {/* Dots indicator */}
                                        <div className="carousel-dots" role="tablist" aria-label="Slide indicators">
                                            {displayImages.map((_, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        goToSlide(index);
                                                    }}
                                                    role="tab"
                                                    aria-selected={index === currentIndex}
                                                    aria-label={`Go to slide ${index + 1}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Live region for accessibility */}
                                        <div className="sr-only" aria-live="polite" aria-atomic="true">
                                            Showing image {currentIndex + 1} of {displayImages.length}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div
                                className="thumbnail-placeholder thumbnail-lead"
                                role="img"
                                aria-label={`Illustration for: ${article.title}`}
                            >
                                <span>{kn.image.featured}</span>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Caption/Subtitle - Tight grouping with image */}
                <p className="body-text" style={{
                    marginBottom: "0.25rem",
                    maxWidth: "800px",
                    fontSize: "14px",
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                }}>
                    {article.subtitle}
                </p>

                {/* Date - Close to caption */}
                <div>
                    <time dateTime={article.publishedAt} className="meta-text">
                        {formattedDate}
                    </time>
                    {article.contentType !== "news" && (
                        <span className="meta-text" style={{ marginLeft: "0.75rem", textTransform: "uppercase", fontWeight: 500 }}>
                            {contentTypeStr}
                        </span>
                    )}
                </div>
            </article>
        </section>
    );
}
