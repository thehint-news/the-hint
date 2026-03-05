/**
 * Translation Service (Production-Grade)
 * 
 * Handles automated Kannada → English translation via Google Cloud Translation API.
 * Server-side only - never expose API keys to client.
 * 
 * Features:
 * - Automatic retries with exponential backoff
 * - Request timeout to prevent hanging
 * - Smart chunking that preserves markdown structure
 * - Rate limiting with burst allowance
 * - Detailed error diagnostics
 */

import { Language } from './language';

// ─── Logger ──────────────────────────────────────────────────────────────────
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

// ─── Configuration ───────────────────────────────────────────────────────────
const TRANSLATION_API_URL =
    process.env.TRANSLATION_API_URL ||
    'https://translation.googleapis.com/language/translate/v2';

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

/** Max time (ms) to wait for a single translate API call */
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds

/** Maximum number of retries for a single translate call */
const MAX_RETRIES = 3;

/** Base delay (ms) for exponential backoff */
const RETRY_BASE_DELAY_MS = 1_000;

/** Maximum characters per translation chunk */
const MAX_CHUNK_CHARS = 4_500;

/** Delay between consecutive chunk translations (ms) */
const INTER_CHUNK_DELAY_MS = 300;

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;  // generous limit
let requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    requestTimestamps.push(now);
    return true;
}

// ─── Types ───────────────────────────────────────────────────────────────────
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
    tags?: string[];
    sources?: string[];
}

interface ArticleTranslationOutput {
    title: string;
    subheadline?: string;
    body: string;
    excerpt?: string;
    tags?: string[];
    sources?: string[];
    translatedAt: string;
    model: string;
}

// ─── Core Translation (with retry + timeout) ────────────────────────────────

/**
 * Call the Google Translate API for a single text string.
 * Includes automatic retry with exponential backoff and fetch timeout.
 */
async function translateText(request: TranslationRequest): Promise<TranslationResult> {
    // ── Pre-flight checks ────────────────────────────────────────────────
    if (!GOOGLE_TRANSLATE_API_KEY) {
        const msg = 'Google Translate API key not configured (GOOGLE_TRANSLATE_API_KEY)';
        logger.error(`[TranslationService] ${msg}`);
        return { success: false, text: request.text, error: msg, timestamp: new Date().toISOString() };
    }

    if (!request.text || request.text.trim().length === 0) {
        return { success: true, text: '', timestamp: new Date().toISOString() };
    }

    if (!checkRateLimit()) {
        const msg = 'Rate limit exceeded – please wait and retry';
        logger.warn(`[TranslationService] ${msg}`);
        return { success: false, text: request.text, error: msg, timestamp: new Date().toISOString() };
    }

    // ── Retry loop ───────────────────────────────────────────────────────
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const urlWithKey = `${TRANSLATION_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`;

            // AbortController for fetch timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            const response = await fetch(urlWithKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_TRANSLATE_API_KEY,
                },
                body: JSON.stringify({
                    q: request.text,
                    target: request.to || 'en',
                    source: request.from || 'kn',
                    format: 'text',
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unable to read error body');
                lastError = `HTTP ${response.status}: ${errorText}`;

                // Non-retryable errors
                if (response.status === 400 || response.status === 403) {
                    logger.error(`[TranslationService] Non-retryable error (${response.status})`, { error: lastError });
                    return { success: false, text: request.text, error: lastError, timestamp: new Date().toISOString() };
                }

                // Retryable – log and continue
                logger.warn(`[TranslationService] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError}`);
            } else {
                // ── Success path ─────────────────────────────────────────
                const data = await response.json();
                const translatedText = data?.data?.translations?.[0]?.translatedText;

                if (!translatedText && translatedText !== '') {
                    lastError = 'API returned success but no translatedText field';
                    logger.warn(`[TranslationService] Unexpected response shape`, { data });
                } else {
                    logger.info(`[TranslationService] ✓ Translated (attempt ${attempt})`, {
                        from: request.from,
                        to: request.to,
                        inputLen: request.text.length,
                        outputLen: translatedText.length,
                    });
                    return { success: true, text: translatedText, timestamp: new Date().toISOString() };
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                lastError = `Request timed out after ${FETCH_TIMEOUT_MS}ms`;
            } else {
                lastError = error instanceof Error ? error.message : String(error);
            }
            logger.warn(`[TranslationService] Attempt ${attempt}/${MAX_RETRIES} exception: ${lastError}`);
        }

        // ── Exponential backoff before retry ─────────────────────────────
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            logger.info(`[TranslationService] Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    // All retries exhausted
    logger.error(`[TranslationService] All ${MAX_RETRIES} attempts failed`, { lastError });
    return { success: false, text: request.text, error: lastError, timestamp: new Date().toISOString() };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Translate simple text to English (used for slug generation)
 */
export async function translateTextToEnglish(text: string): Promise<string | null> {
    try {
        const result = await translateText({ text, from: 'kn', to: 'en' });
        return result.success ? result.text : null;
    } catch (e) {
        logger.error('[TranslationService] translateTextToEnglish failed', { error: String(e) });
        return null;
    }
}

// ─── Markdown-aware chunking ─────────────────────────────────────────────────

/**
 * Split markdown content into translation-safe chunks.
 * Preserves paragraph boundaries and avoids cutting mid-sentence.
 */
function splitMarkdownContent(content: string): string[] {
    if (!content || content.trim().length === 0) return [];

    // Split by double newlines (paragraph boundary)
    const paragraphs = content.split(/\n\n+/);
    const result: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
        if (currentChunk.length + para.length + 2 > MAX_CHUNK_CHARS && currentChunk.length > 0) {
            result.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    if (currentChunk.trim()) {
        result.push(currentChunk.trim());
    }

    return result;
}

// ─── Article Translation ─────────────────────────────────────────────────────

/**
 * Translate a full article from Kannada to English.
 * 
 * This is the main entry point used by the publish pipeline.
 * Features:
 * - Translates title, subheadline, excerpt, and body
 * - Body is translated in safe chunks with delays
 * - Every chunk has automatic retries
 * - Returns null ONLY if title translation fails (non-recoverable)
 * - Body chunks that fail individually preserve the original text
 */
export async function translateArticle(
    article: ArticleTranslationInput
): Promise<ArticleTranslationOutput | null> {
    const startTime = Date.now();

    logger.info('[TranslationService] ── Starting article translation ──', {
        titlePreview: article.title.slice(0, 80),
        hasSubheadline: !!article.subheadline,
        hasExcerpt: !!article.excerpt,
        bodyLength: article.body?.length || 0,
    });

    try {
        // ── 1) Title (REQUIRED – if this fails, abort entirely) ──────────
        const titleResult = await translateText({ text: article.title, from: 'kn', to: 'en' });
        if (!titleResult.success) {
            logger.error('[TranslationService] Title translation failed – aborting', { error: titleResult.error });
            return null;
        }

        // ── 2) Subheadline (optional – fallback to original) ─────────────
        let translatedSubheadline = article.subheadline;
        if (article.subheadline) {
            const subResult = await translateText({ text: article.subheadline, from: 'kn', to: 'en' });
            if (subResult.success) {
                translatedSubheadline = subResult.text;
            } else {
                logger.warn('[TranslationService] Subheadline translation failed, using original');
            }
        }

        // ── 3) Excerpt (optional – fallback to subheadline) ──────────────
        let translatedExcerpt = article.excerpt;
        if (article.excerpt) {
            const excerptResult = await translateText({ text: article.excerpt, from: 'kn', to: 'en' });
            if (excerptResult.success) {
                translatedExcerpt = excerptResult.text;
            } else {
                logger.warn('[TranslationService] Excerpt translation failed, using original');
            }
        }

        // ── 4) Body (translated in chunks) ───────────────────────────────
        let translatedBody = '';
        if (article.body && article.body.trim().length > 0) {
            const bodyChunks = splitMarkdownContent(article.body);
            const translatedChunks: string[] = [];

            logger.info(`[TranslationService] Body split into ${bodyChunks.length} chunk(s)`);

            for (let i = 0; i < bodyChunks.length; i++) {
                const chunk = bodyChunks[i];
                logger.info(`[TranslationService] Translating chunk ${i + 1}/${bodyChunks.length} (${chunk.length} chars)`);

                const chunkResult = await translateText({ text: chunk, from: 'kn', to: 'en' });

                if (chunkResult.success) {
                    translatedChunks.push(chunkResult.text);
                } else {
                    logger.warn(`[TranslationService] Chunk ${i + 1} failed, keeping original`, {
                        error: chunkResult.error,
                    });
                    translatedChunks.push(chunk);
                }

                // Small delay between chunks to be kind to the API
                if (i < bodyChunks.length - 1) {
                    await sleep(INTER_CHUNK_DELAY_MS);
                }
            }

            translatedBody = translatedChunks.join('\n\n');
        }

        // ── 5) Tags and Sources (optional) ───────────────────────────────
        let translatedTags = article.tags;
        if (article.tags && article.tags.length > 0) {
            const tagsRes = [];
            for (const tag of article.tags) {
                const tr = await translateText({ text: tag, from: 'kn', to: 'en' });
                if (tr.success) tagsRes.push(tr.text);
                else tagsRes.push(tag);
                await sleep(INTER_CHUNK_DELAY_MS);
            }
            translatedTags = tagsRes;
        }

        let translatedSources = article.sources;
        if (article.sources && article.sources.length > 0) {
            const srcRes = [];
            for (const src of article.sources) {
                const tr = await translateText({ text: src, from: 'kn', to: 'en' });
                if (tr.success) srcRes.push(tr.text);
                else srcRes.push(src);
                await sleep(INTER_CHUNK_DELAY_MS);
            }
            translatedSources = srcRes;
        }

        const elapsed = Date.now() - startTime;
        logger.info(`[TranslationService] ── Article translation complete (${elapsed}ms) ──`, {
            titlePreview: titleResult.text.slice(0, 80),
            bodyLength: translatedBody.length,
        });

        return {
            title: titleResult.text,
            subheadline: translatedSubheadline,
            body: translatedBody,
            excerpt: translatedExcerpt,
            tags: translatedTags,
            sources: translatedSources,
            translatedAt: new Date().toISOString(),
            model: 'google-translate-v2',
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[TranslationService] Article translation failed unexpectedly', { error: msg });
        return null;
    }
}

// ─── Stale-check and validation ──────────────────────────────────────────────

/**
 * Check if translation is stale (article updated after translation)
 */
export function isTranslationStale(
    articleUpdatedAt: string,
    translationTimestamp?: string
): boolean {
    if (!translationTimestamp) return true;
    return new Date(articleUpdatedAt).getTime() > new Date(translationTimestamp).getTime();
}

/**
 * Validate translation result quality.
 * Simple heuristics to detect bad translations.
 */
export function validateTranslation(
    original: ArticleTranslationInput,
    translation: ArticleTranslationOutput
): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    const titleRatio = translation.title.length / (original.title.length || 1);
    if (titleRatio < 0.2 || titleRatio > 5) {
        issues.push('Title length anomaly detected');
    }

    const bodyRatio = translation.body.length / (original.body.length || 1);
    if (original.body.length > 50 && bodyRatio < 0.3) {
        issues.push('Body translation appears truncated');
    }

    if (translation.title.includes('[Translate') || translation.title.includes('Translation:')) {
        issues.push('Title contains translation artifacts');
    }

    return { valid: issues.length === 0, issues };
}

export type {
    ArticleTranslationInput,
    ArticleTranslationOutput,
    TranslationResult,
};
