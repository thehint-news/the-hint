import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { generateContentGraph, ContentGraph } from '../src/lib/content/generateContentGraph';
import { logger } from '../src/lib/feedback/console-guard';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const GRAPH_PATH = path.join(CACHE_DIR, 'contentGraph.json');
const CONTENT_DIR = path.join(process.cwd(), 'src/content');
const IMAGE_METADATA_PATH = path.join(CONTENT_DIR, 'image-metadata.json');

async function probeImage(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();
        
        // Use sharp to get actual image dimensions and format
        const metadata = await sharp(Buffer.from(buffer)).metadata();
        
        // Only override contentType if sharp identifies a specific format and it wasn't provided well by HTTP
        let finalType = contentType;
        if (metadata.format && contentType === 'application/octet-stream') {
            finalType = `image/${metadata.format}`;
        } else if (metadata.format) {
            // Prefer sharp's format if it differs from a generic one
            finalType = `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`;
        }

        return {
            width: metadata.width,
            height: metadata.height,
            type: finalType
        };
    } catch (error) {
        logger.error(`Failed to probe image: ${url}`, error);
        return null;
    }
}

async function run() {
    const startTime = Date.now();
    logger.info('Starting image metadata backfill...');

    let graph: ContentGraph;
    if (fs.existsSync(GRAPH_PATH)) {
        graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf-8'));
    } else {
        logger.info('Content graph not found. Generating initial graph...');
        graph = generateContentGraph();
    }

    let imageMetadataCache: Record<string, { width: number; height: number; type: string }> = {};
    if (fs.existsSync(IMAGE_METADATA_PATH)) {
        imageMetadataCache = JSON.parse(fs.readFileSync(IMAGE_METADATA_PATH, 'utf-8'));
    }

    let articlesScanned = 0;
    let imagesFound = 0;
    let successfulProbes = 0;
    let failedProbes = 0;
    let newDimensionsDiscovered = 0;
    const missingImages: string[] = [];

    const uniqueUrlsToProbe = new Set<string>();

    for (const article of graph.sortedArticles) {
        articlesScanned++;
        if (article.image) {
            imagesFound++;
            // Check if already in cache
            if (!imageMetadataCache[article.image]) {
                uniqueUrlsToProbe.add(article.image);
            }
        }
    }

    logger.info(`Found ${uniqueUrlsToProbe.size} new unique images to probe.`);

    for (const url of Array.from(uniqueUrlsToProbe)) {
        logger.info(`Probing: ${url}`);
        const metadata = await probeImage(url);
        if (metadata && metadata.width && metadata.height) {
            imageMetadataCache[url] = {
                width: metadata.width,
                height: metadata.height,
                type: metadata.type
            };
            successfulProbes++;
            newDimensionsDiscovered++;
        } else {
            failedProbes++;
            missingImages.push(url);
        }
    }

    // Save the cache
    if (newDimensionsDiscovered > 0 || !fs.existsSync(IMAGE_METADATA_PATH)) {
        fs.writeFileSync(IMAGE_METADATA_PATH, JSON.stringify(imageMetadataCache, null, 2), 'utf-8');
        logger.info(`Saved new dimensions to ${IMAGE_METADATA_PATH}`);
        
        // Regenerate the content graph atomically so it incorporates the new metadata
        logger.info('Regenerating content graph to include new image metadata...');
        generateContentGraph();
    } else {
        logger.info('No new dimensions discovered. Graph remains unchanged.');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n==================================================');
    logger.info('BACKFILL REPORT');
    logger.info('==================================================');
    logger.info(`Articles scanned:      ${articlesScanned}`);
    logger.info(`Images found:          ${imagesFound}`);
    logger.info(`Successful probes:     ${successfulProbes}`);
    logger.info(`Failed probes:         ${failedProbes}`);
    logger.info(`Dimensions discovered: ${newDimensionsDiscovered}`);
    logger.info(`Duration:              ${duration}s`);
    logger.info('==================================================');

    if (failedProbes > 0) {
        logger.warn('Failed to probe the following images:');
        missingImages.forEach(img => logger.warn(`- ${img}`));
    }
}

run().catch(err => {
    logger.error('Unhandled error during backfill', err);
    process.exit(1);
});
