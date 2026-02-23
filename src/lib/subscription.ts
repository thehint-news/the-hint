/**
 * Subscription Management
 * 
 * Manages the subscriber list using Git as the backend.
 * All operations are asynchronous and result in commits.
 */

import { gitService } from './git/service';

const SUBSCRIBERS_PATH = 'src/data/subscribers.json';

export interface Subscriber {
    email: string;
    subscribedAt: string;
    active: boolean;
}

async function readSubscribers(): Promise<Subscriber[]> {
    try {
        const content = await gitService.readFile(SUBSCRIBERS_PATH);
        if (!content) return [];
        return JSON.parse(content);
    } catch (error) {
        console.error('Failed to read subscribers:', error);
        return [];
    }
}

async function writeSubscribers(subscribers: Subscriber[], message: string): Promise<void> {
    await gitService.saveFile(SUBSCRIBERS_PATH, JSON.stringify(subscribers, null, 2), message);
}

export async function addSubscriber(email: string): Promise<{ success: boolean; message: string; isDuplicate?: boolean }> {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const subscribers = await readSubscribers();
        const existing = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);

        if (existing) {
            // Update timestamp even if already active to track re-joining intent
            existing.subscribedAt = new Date().toISOString();
            existing.email = normalizedEmail; // Use normalized

            if (!existing.active) {
                existing.active = true;
                await writeSubscribers(subscribers, `Re-subscribe: ${normalizedEmail}`);
                return { success: true, message: 'Successfully subscribed.', isDuplicate: true };
            }

            // If already active, still save the update to 'subscribedAt' and return success message
            await writeSubscribers(subscribers, `Repeat subscribe: ${normalizedEmail}`);
            return { success: true, message: 'Successfully subscribed.', isDuplicate: true };
        }

        subscribers.push({
            email: normalizedEmail,
            subscribedAt: new Date().toISOString(),
            active: true,
        });

        await writeSubscribers(subscribers, `New subscriber: ${normalizedEmail}`);
        return { success: true, message: 'Successfully subscribed.' };
    } catch (error) {
        console.error('Add subscriber failed:', error);
        return { success: false, message: 'Subscription failed. Please try again.' };
    }
}

export async function getActiveSubscribers(): Promise<string[]> {
    const subscribers = await readSubscribers();
    return subscribers
        .filter(s => s.active)
        .map(s => s.email);
}

export async function unsubscribe(email: string): Promise<{ success: boolean; message: string }> {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const subscribers = await readSubscribers();
        const subscriber = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);

        if (!subscriber) {
            return { success: false, message: 'Email not found in our subscription list.' };
        }

        if (!subscriber.active) {
            return { success: true, message: 'You are already unsubscribed.' };
        }

        subscriber.active = false;
        await writeSubscribers(subscribers, `Unsubscribe: ${normalizedEmail}`);
        return { success: true, message: 'You have been successfully unsubscribed.' };
    } catch (error) {
        console.error('Unsubscribe failed:', error);
        return { success: false, message: 'Unsubscribe failed. Please try again.' };
    }
}

export async function isSubscribed(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const subscribers = await readSubscribers();
    const subscriber = subscribers.find(s => s.email.toLowerCase() === normalizedEmail);
    return subscriber ? subscriber.active : false;
}
