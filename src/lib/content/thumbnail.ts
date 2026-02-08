/**
 * Thumbnail Extraction Utility
 * 
 * Extracts the first image from article body to use as thumbnail.
 * This ensures every article has a representative image for listings,
 * cards, and social sharing - using the article's first image as the thumbnail.
 * 
 * THUMBNAIL RULE: Article's first image must be used as thumbnail.
 * The thumbnail is displayed at the top of article cards, optimized for
 * proper aspect ratio and embedding.
 * 
 * NO JSX, NO UI LAYER IMPORTS.
 */

/**
 * Extract the first image URL from article body content.
 * 
 * Supports multiple image formats in order of priority:
 * 1. Custom :::image block syntax (:::image ... src: url ...)
 * 2. Markdown image syntax (![alt](url))
 * 3. HTML img tag (<img src="url" />)
 * 
 * @param body - Raw Markdown body content
 * @returns First image URL found, or undefined if no images exist
 */
export function extractFirstImageFromBody(body: string): string | undefined {
    if (!body || typeof body !== 'string') {
        return undefined;
    }

    // 1. Match custom :::image block syntax
    //    Format: :::image\n  src: https://example.com/image.jpg\n  ...
    const customBlockMatch = body.match(/:::image[\s\S]*?src:\s*([^\s\n]+)/);
    if (customBlockMatch && customBlockMatch[1]) {
        return customBlockMatch[1].trim();
    }

    // 2. Match Markdown image syntax: ![alt text](url)
    const markdownMatch = body.match(/!\[.*?\]\((.*?)\)/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }

    // 3. Match HTML img tag: <img src="url" /> or <img src='url' />
    const htmlMatch = body.match(/<img[^>]+src=["']([^"']+)["']/);
    if (htmlMatch && htmlMatch[1]) {
        return htmlMatch[1].trim();
    }

    return undefined;
}

/**
 * Get the thumbnail image URL for an article.
 * 
 * Priority:
 * 1. Explicit featured image from frontmatter
 * 2. First image found in article body
 * 
 * @param explicitImage - Image URL from frontmatter (may be undefined)
 * @param body - Raw Markdown body content
 * @returns Thumbnail URL or undefined if no images available
 */
export function getArticleThumbnail(
    explicitImage: string | undefined,
    body: string
): string | undefined {
    // Priority 1: Use explicit featured image if provided
    if (explicitImage && explicitImage.trim()) {
        return explicitImage.trim();
    }

    // Priority 2: Extract first image from body
    return extractFirstImageFromBody(body);
}
