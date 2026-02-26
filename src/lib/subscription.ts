/**
 * Subscription Management
 * 
 * Manages the subscriber list using Git as the backend.
 * All operations are asynchronous and result in commits.
 * 
 * Includes in-memory cache for resilience during Git API failures.
 */

import { gitService } from './git/service';
import { logger } from './feedback/console-guard';

const SUBSCRIBERS_PATH = 'src/data/subscribers.json';

export interface Subscriber {
    email: string;
    subscribedAt: string;
    active: boolean;
}

let subscribersCache: Subscriber[] | null = null;
let cacheLoaded = false;
let lastCacheLoad: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

async function readSubscribers(): Promise<Subscriber[]> {
    try {
        const content = await gitService.readFile(SUBSCRIBERS_PATH);
        if (!content) {
            subscribersCache = [];
            cacheLoaded = true;
            lastCacheLoad = Date.now();
            return [];
        }
        const parsed = JSON.parse(content);
        subscribersCache = parsed;
        cacheLoaded = true;
        lastCacheLoad = Date.now();
        return parsed;
    } catch (error) {
        console.error('Failed to read subscribers:', error);
        if (subscribersCache) {
            console.warn('[SUBSCRIPTION] Using stale cache due to Git API failure');
            return subscribersCache;
        }
        return [];
    }
}

async function getCachedSubscribers(): Promise<Subscriber[]> {
    const now = Date.now();
    if (!cacheLoaded || !subscribersCache || (now - lastCacheLoad) > CACHE_TTL) {
        return await readSubscribers();
    }
    return subscribersCache;
}

function invalidateCache(): void {
    subscribersCache = null;
    cacheLoaded = false;
    lastCacheLoad = 0;
}

// Force reload cache (exported for admin use)
export function reloadSubscribersCache(): void {
    invalidateCache();
}

async function writeSubscribers(subscribers: Subscriber[], message: string): Promise<boolean> {
    try {
        await gitService.saveFile(SUBSCRIBERS_PATH, JSON.stringify(subscribers, null, 2), message);
        subscribersCache = subscribers;
        lastCacheLoad = Date.now();
        cacheLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to write subscribers:', error);
        logger.error(`[SUBSCRIPTION] Git API write failed: ${error}`);
        return false;
    }
}

export async function addSubscriber(email: string): Promise<{ success: boolean; message: string; isDuplicate?: boolean; storageSuccess?: boolean; error?: string }> {
    try {
        const normalizedEmail = email.trim().toLowerCase();

        // Always read latest to avoid caching issues
        const content = await gitService.readFile(SUBSCRIBERS_PATH);
        logger.info(`[SUBSCRIBE] Checkpoint: Git read success`);

        const subscribers: Subscriber[] = content ? JSON.parse(content) : [];
        const existing = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);

        if (existing) {
            logger.info(`[SUBSCRIBE] Checkpoint: Duplicate check result - found (${existing.active ? 'active' : 'inactive'})`);

            if (existing.active) {
                // Rule: If already active, return 'Already subscribed'
                return { success: false, message: 'Already subscribed', error: 'Email already exists', isDuplicate: true };
            }

            existing.subscribedAt = new Date().toISOString();
            existing.active = true;

            logger.info(`[SUBSCRIBE] Checkpoint: Git write started`);
            const writeSuccess = await writeSubscribers(subscribers, `Re-subscribe: ${normalizedEmail}`);
            if (!writeSuccess) {
                return { success: false, message: 'Storage temporarily unavailable. Please try again.', storageSuccess: false, error: 'Git write failed' };
            }
            logger.info(`[SUBSCRIBE] Checkpoint: Git write success`);
            return { success: true, message: 'Subscription successful', isDuplicate: false, storageSuccess: true };
        }

        logger.info(`[SUBSCRIBE] Checkpoint: Duplicate check result - not found`);

        subscribers.push({
            email: normalizedEmail,
            subscribedAt: new Date().toISOString(),
            active: true,
        });

        logger.info(`[SUBSCRIBE] Checkpoint: Git write started`);
        const writeSuccess = await writeSubscribers(subscribers, `New subscriber: ${normalizedEmail}`);
        if (!writeSuccess) {
            return { success: false, message: 'Storage temporarily unavailable. Please try again.', storageSuccess: false, error: 'Git write failed' };
        }

        logger.info(`[SUBSCRIBE] Checkpoint: Git write success`);
        return { success: true, message: 'Subscription successful', storageSuccess: true };
    } catch (error) {
        console.error('Add subscriber failed:', error);
        logger.error(`[SUBSCRIBE] Add subscriber error: ${error}`);
        return { success: false, message: 'Subscription failed. Please try again.', error: String(error) };
    }
}

export async function getActiveSubscribers(): Promise<string[]> {
    const subscribers = await getCachedSubscribers();
    return subscribers
        .filter(s => s.active)
        .map(s => s.email);
}

export async function unsubscribe(email: string): Promise<{ success: boolean; message: string; storageSuccess?: boolean }> {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const subscribers = await getCachedSubscribers();
        const subscriber = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);

        if (!subscriber) {
            return { success: true, message: 'You are already unsubscribed.', storageSuccess: true };
        }

        if (!subscriber.active) {
            return { success: true, message: 'You are already unsubscribed.', storageSuccess: true };
        }

        subscriber.active = false;
        const writeSuccess = await writeSubscribers(subscribers, `Unsubscribe: ${normalizedEmail}`);

        if (!writeSuccess) {
            return { success: false, message: 'Storage temporarily unavailable. Please try again.', storageSuccess: false };
        }

        return { success: true, message: 'You have been successfully unsubscribed.', storageSuccess: true };
    } catch (error) {
        console.error('Unsubscribe failed:', error);
        logger.error(`[SUBSCRIPTION] Unsubscribe error: ${error}`);
        return { success: false, message: 'Unsubscribe failed. Please try again.' };
    }
}

export async function isSubscribed(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const subscribers = await getCachedSubscribers();
    const subscriber = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);
    return subscriber ? subscriber.active : false;
}
