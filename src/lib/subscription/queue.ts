import { gitService, createGitStaging } from '../git/service';
import { SubscriptionEvent, QueueStatus } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
import { logger } from '../feedback/console-guard';

const QUEUE_PATH = 'src/data/subscription-events.json';
const LOCK_PATH = 'src/data/queue.lock';

let eventsCache: SubscriptionEvent[] | null = null;
let cacheLoaded = false;
let lastCacheLoad: number = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

class SubscriptionQueue {
    private mutex = new Mutex();

    private async getEvents(): Promise<SubscriptionEvent[]> {
        try {
            const data = await gitService.readFile(QUEUE_PATH);
            if (!data) {
                eventsCache = [];
                cacheLoaded = true;
                lastCacheLoad = Date.now();
                return [];
            }
            const parsed = JSON.parse(data) as SubscriptionEvent[];
            eventsCache = parsed;
            cacheLoaded = true;
            lastCacheLoad = Date.now();
            return parsed;
        } catch (error) {
            logger.error(`[QUEUE] Git API read failed: ${error}`);
            if (eventsCache) {
                return eventsCache;
            }
            return [];
        }
    }

    private async getCachedEvents(): Promise<SubscriptionEvent[]> {
        const now = Date.now();
        if (!cacheLoaded || !eventsCache || (now - lastCacheLoad) > CACHE_TTL) {
            return await this.getEvents();
        }
        return eventsCache;
    }

    private async saveEvents(events: SubscriptionEvent[], message: string): Promise<boolean> {
        try {
            await gitService.saveFile(QUEUE_PATH, JSON.stringify(events, null, 2), message);
            eventsCache = events;
            lastCacheLoad = Date.now();
            cacheLoaded = true;
            return true;
        } catch (error) {
            logger.error(`[QUEUE] Git API write failed: ${error}`);
            throw error;
        }
    }

    /**
     * Enqueue a new publication event.
     */
    public async enqueue(
        data: Omit<SubscriptionEvent, 'id' | 'createdAt' | 'status' | 'attempts' | 'processedCount' | 'sentEmails'>
    ): Promise<SubscriptionEvent> {
        return await this.mutex.runExclusive(async () => {
            const event: SubscriptionEvent = {
                id: uuidv4(),
                ...data,
                createdAt: new Date().toISOString(),
                status: 'pending',
                attempts: 0,
                processedCount: 0,
                sentEmails: [],
            };

            const events = await this.getEvents();
            events.push(event);

            try {
                await this.saveEvents(events, `Enqueue: subscription event ${event.id}`);
            } catch (error) {
                logger.error(`[QUEUE] Failed to enqueue event: ${error}`);
                // Still return the event - it will be in memory
            }

            return event;
        });
    }

    /**
     * Get the next pending event respecting priority.
     */
    public async getNextPending(): Promise<SubscriptionEvent | null> {
        const events = await this.getCachedEvents();

        const pending = events.filter(e => e.status === 'pending');

        if (pending.length === 0) return null;

        pending.sort((a, b) => {
            const priorityScore = { breaking: 3, important: 2, normal: 1 };
            const scoreA = priorityScore[a.priority as keyof typeof priorityScore];
            const scoreB = priorityScore[b.priority as keyof typeof priorityScore];

            if (scoreA !== scoreB) return (scoreB || 0) - (scoreA || 0);

            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        return pending[0];
    }

    public async updateEvent(id: string, updates: Partial<SubscriptionEvent>): Promise<void> {
        return await this.mutex.runExclusive(async () => {
            const events = await this.getEvents();
            const index = events.findIndex(e => e.id === id);

            if (index === -1) {
                throw new Error(`Subscription event with ID ${id} not found for update.`);
            }

            events[index] = { ...events[index], ...updates };
            await this.saveEvents(events, `Update event ${id}: ${updates.status || 'data update'}`);
        });
    }

    public async getStatus(): Promise<QueueStatus> {
        const events = await this.getCachedEvents();
        return {
            length: events.length,
            pending: events.filter(e => e.status === 'pending').length,
            processing: events.filter(e => e.status === 'processing').length,
            failed: events.filter(e => e.status === 'failed').length,
            paused: await this.isPaused(),
        };
    }

    public async getEvent(id: string): Promise<SubscriptionEvent | undefined> {
        return (await this.getCachedEvents()).find(e => e.id === id);
    }

    public async pauseQueue(): Promise<void> {
        await gitService.saveFile(LOCK_PATH, 'PAUSED', 'Pause subscription queue');
    }

    public async resumeQueue(): Promise<void> {
        const staging = createGitStaging();
        await gitService.deleteFile(LOCK_PATH, staging);
        await gitService.commitDeletion(LOCK_PATH, 'Resume subscription queue', staging);
    }

    public async isPaused(): Promise<boolean> {
        return await gitService.fileExists(LOCK_PATH);
    }
}

export const queueManager = new SubscriptionQueue();
