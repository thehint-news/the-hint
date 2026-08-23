import fs from 'fs';
import path from 'path';
import { ContentGraph } from '../src/lib/content/generateContentGraph';
import { logger } from '../src/lib/feedback/console-guard';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const GRAPH_PATH = path.join(CACHE_DIR, 'contentGraph.json');

async function validateImage(url: string, expectedWidth?: number, expectedHeight?: number) {
    const startTime = Date.now();
    try {
        if (!url.startsWith('https://')) {
            return { valid: false, error: 'Not HTTPS' };
        }

        const response = await fetch(url, { method: 'HEAD' });
        const latency = Date.now() - startTime;
        
        if (!response.ok) {
            return { valid: false, error: `HTTP ${response.status}`, latency };
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            return { valid: false, error: `Invalid Content-Type: ${contentType}`, latency };
        }

        const contentLength = response.headers.get('content-length');
        if (!contentLength || parseInt(contentLength, 10) === 0) {
            return { valid: false, error: `Invalid Content-Length: ${contentLength}`, latency };
        }

        if (!expectedWidth || !expectedHeight) {
            return { valid: false, error: 'Missing dimensions in graph', latency };
        }

        if (expectedWidth <= 0 || expectedHeight <= 0) {
            return { valid: false, error: `Invalid dimensions: ${expectedWidth}x${expectedHeight}`, latency };
        }

        return { valid: true, latency };
    } catch (error) {
        return { valid: false, error: String(error) };
    }
}

async function run() {
    logger.info('Starting Image Metadata Validation...');

    if (!fs.existsSync(GRAPH_PATH)) {
        logger.error('Content graph not found. Run generate-graph first.');
        process.exit(1);
    }

    const graph: ContentGraph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf-8'));
    
    let scanned = 0;
    let valid = 0;
    let invalid = 0;
    let missingImage = 0;
    
    const errors: Array<{ article: string, url: string, error: string }> = [];

    // Only validate unique images to avoid redundant network requests
    const uniqueImages = new Map<string, { width?: number, height?: number, articles: string[] }>();

    for (const article of graph.sortedArticles) {
        if (article.image) {
            if (!uniqueImages.has(article.image)) {
                uniqueImages.set(article.image, { 
                    width: article.imageWidth, 
                    height: article.imageHeight, 
                    articles: [] 
                });
            }
            uniqueImages.get(article.image)!.articles.push(article.slug);
        } else {
            missingImage++;
        }
    }

    logger.info(`Found ${uniqueImages.size} unique images to validate.`);

    for (const [url, data] of uniqueImages.entries()) {
        scanned++;
        const result = await validateImage(url, data.width, data.height);
        
        if (result.valid) {
            valid++;
        } else {
            invalid++;
            errors.push({
                article: data.articles.join(', '),
                url,
                error: result.error || 'Unknown error'
            });
        }
    }

    logger.info('\n==================================================');
    logger.info('VALIDATION REPORT');
    logger.info('==================================================');
    logger.info(`Images scanned: ${scanned}`);
    logger.info(`Valid images:   ${valid}`);
    logger.info(`Invalid images: ${invalid}`);
    logger.info(`Articles w/o img: ${missingImage}`);
    logger.info('==================================================');

    if (errors.length > 0) {
        logger.error('\nERRORS FOUND:');
        errors.forEach(e => {
            logger.error(`\nArticles: ${e.article}\nURL: ${e.url}\nError: ${e.error}`);
        });
        process.exit(1);
    } else {
        logger.info('\nAll images validated successfully!');
    }
}

run().catch(err => {
    logger.error('Unhandled error', err);
    process.exit(1);
});
