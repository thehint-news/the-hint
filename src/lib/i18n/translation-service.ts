/**
 * Translation Service
 * Handles automated translation generation on publish
 * Server-side only - never expose API keys to client
 */

import { Language } from './language';

// Simple logger for server-side
const logger = {
    info: (message: string, meta?: Record<string, unknown>) => {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error: (message: string, meta?: Record<string, unknown>) => {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    },
};

// Google Cloud Translation API configuration
const TRANSLATION_API_URL = process.env.TRANSLATION_API_URL || 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
let requestTimestamps: number[] = [];

interface TranslationRequest {
    text: string;
    from: Language;
    to: Language;
}

interface TranslationResult {
    success: boolean;
    text: string;
    error?: string;
    timestamp: string;
}

interface ArticleTranslationInput {
    title: string;
    subheadline?: string;
    body: string; // Markdown content
    excerpt?: string;
}

interface ArticleTranslationOutput {
    title: string;
    subheadline?: string;
    body: string;
    excerpt?: string;
    translatedAt: string;
    model: string;
}

/**
 * Check rate limit for translation API calls
 */
function checkRateLimit(): boolean {
    const now = Date.now();
    // Remove timestamps outside the window
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    requestTimestamps.push(now);
    return true;
}

/**
 * Translate text using Google Cloud Translation API
 */
async function translateText(request: TranslationRequest): Promise<TranslationResult> {
    // Validate API key
    if (!GOOGLE_TRANSLATE_API_KEY) {
        logger.error('[TranslationService] Google Translate API key not configured');
        return {
            success: false,
            text: request.text,
            error: 'Google Translate API key not configured',
            timestamp: new Date().toISOString(),
        };
    }

    // Check rate limit
    if (!checkRateLimit()) {
        logger.warn('[TranslationService] Rate limit exceeded');
        return {
            success: false,
            text: request.text,
            error: 'Rate limit exceeded',
            timestamp: new Date().toISOString(),
        };
    }

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_TRANSLATE_API_KEY,
        };

        const body: Record<string, unknown> = {
            q: request.text,
            source: request.from,
            target: request.to,
            format: 'text',
        };

        const response = await fetch(TRANSLATION_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Translation API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Google Cloud Translation API response format: data.translations[0].translatedText
        const translatedText = data.data?.translations?.[0]?.translatedText || request.text;

        logger.info('[TranslationService] Translation successful', {
            from: request.from,
            to: request.to,
            textLength: request.text.length,
        });

        return {
            success: true,
            text: translatedText,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[TranslationService] Translation failed', { error: errorMessage });

        return {
            success: false,
            text: request.text,
            error: errorMessage,
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Translate simple text to English (helper for slugs)
 */
export async function translateTextToEnglish(text: string): Promise<string | null> {
    try {
        const result = await translateText({
            text,
            from: 'kn',
            to: 'en',
        });
        if (result.success) {
            return result.text;
        }
        return null;
    } catch (e) {
        logger.error('[TranslationService] translateTextToEnglish failed', { error: e });
        return null;
    }
}

/**
 * Split markdown content into chunks for translation
 * Preserves markdown structure
 */
function splitMarkdownContent(content: string): string[] {
    // Split by double newlines to preserve paragraph structure
    const chunks = content.split(/\n\n+/);
    const result: string[] = [];
    let currentChunk = '';

    for (const chunk of chunks) {
        // If adding this chunk would exceed limit, push current and start new
        if (currentChunk.length + chunk.length > 3000 && currentChunk.length > 0) {
            result.push(currentChunk.trim());
            currentChunk = chunk;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + chunk;
        }
    }

    if (currentChunk) {
        result.push(currentChunk.trim());
    }

    return result;
}

/**
 * Translate article content from Kannada to English
 * Called automatically when article is published
 */
export async function translateArticle(
    article: ArticleTranslationInput
): Promise<ArticleTranslationOutput | null> {
    logger.info('[TranslationService] Starting article translation', {
        title: article.title.slice(0, 50),
        hasSubheadline: !!article.subheadline,
        bodyLength: article.body.length,
    });

    try {
        // Translate title
        const titleResult = await translateText({
            text: article.title,
            from: 'kn',
            to: 'en',
        });

        if (!titleResult.success) {
            logger.error('[TranslationService] Title translation failed', { error: titleResult.error });
            return null;
        }

        // Translate subheadline if exists
        let subheadlineResult: TranslationResult | undefined;
        if (article.subheadline) {
            subheadlineResult = await translateText({
                text: article.subheadline,
                from: 'kn',
                to: 'en',
            });
        }

        // Translate excerpt if exists
        let excerptResult: TranslationResult | undefined;
        if (article.excerpt) {
            excerptResult = await translateText({
                text: article.excerpt,
                from: 'kn',
                to: 'en',
            });
        }

        // Translate body in chunks to handle long articles
        const bodyChunks = splitMarkdownContent(article.body);
        const translatedChunks: string[] = [];

        for (let i = 0; i < bodyChunks.length; i++) {
            const chunk = bodyChunks[i];
            logger.info(`[TranslationService] Translating body chunk ${i + 1}/${bodyChunks.length}`);

            const chunkResult = await translateText({
                text: chunk,
                from: 'kn',
                to: 'en',
            });

            if (chunkResult.success) {
                translatedChunks.push(chunkResult.text);
            } else {
                // If translation fails, keep original chunk
                logger.warn(`[TranslationService] Chunk ${i + 1} translation failed, keeping original`);
                translatedChunks.push(chunk);
            }

            // Small delay between chunks to avoid rate limits
            if (i < bodyChunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const translatedBody = translatedChunks.join('\n\n');

        logger.info('[TranslationService] Article translation complete', {
            title: titleResult.text.slice(0, 50),
            bodyLength: translatedBody.length,
        });

        return {
            title: titleResult.text,
            subheadline: subheadlineResult?.success ? subheadlineResult.text : article.subheadline,
            body: translatedBody,
            excerpt: excerptResult?.success ? excerptResult.text : article.excerpt,
            translatedAt: new Date().toISOString(),
            model: 'google-translate-v2',
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[TranslationService] Article translation failed', { error: errorMessage });
        return null;
    }
}

/**
 * Check if translation is stale (article updated after translation)
 */
export function isTranslationStale(
    articleUpdatedAt: string,
    translationTimestamp?: string
): boolean {
    if (!translationTimestamp) {
        return true; // No translation exists
    }

    const updatedAt = new Date(articleUpdatedAt).getTime();
    const translatedAt = new Date(translationTimestamp).getTime();

    return updatedAt > translatedAt;
}

/**
 * Validate translation result quality
 * Simple heuristics to detect bad translations
 */
export function validateTranslation(
    original: ArticleTranslationInput,
    translation: ArticleTranslationOutput
): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if translated title is too short or too long compared to original
    const titleRatio = translation.title.length / original.title.length;
    if (titleRatio < 0.3 || titleRatio > 3) {
        issues.push('Title length anomaly detected');
    }

    // Check if body translation is significantly shorter
    const bodyRatio = translation.body.length / original.body.length;
    if (bodyRatio < 0.5) {
        issues.push('Body translation appears truncated');
    }

    // Check for common failure indicators
    if (translation.title.includes('[Translate') || translation.title.includes('Translation:')) {
        issues.push('Title contains translation artifacts');
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}

export type {
    ArticleTranslationInput,
    ArticleTranslationOutput,
    TranslationResult,
};
