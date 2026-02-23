
import { queueManager } from './queue';
import { logger } from '../feedback/console-guard';
import { sendEmailForEvent } from './email-service';
import { getActiveSubscribers } from '../subscription';
import { EmailWorkerConfig, SubscriptionEvent } from './types';

const CONFIG: EmailWorkerConfig = {
    maxEmailsPerMinute: 60, // 1 per second
    maxRetries: 3,
    circuitBreakerThreshold: 10,
    batchSize: 20, // Process only 20 emails per invocation to avoid timeouts
};

// Simple delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processSubscriptionQueue(): Promise<{ processed: number; errors: number; remaining: boolean }> {
    // 1. Check if paused
    if (await queueManager.isPaused()) {
        logger.info('[QUEUE] Subscription queue is PAUSED.');
        return { processed: 0, errors: 0, remaining: true };
    }

    // 2. Get next event
    const event = await queueManager.getNextPending();
    if (!event) {
        return { processed: 0, errors: 0, remaining: false };
    }

    // 3. Mark as processing (or continue processing)
    if (event.status === 'pending') {
        await queueManager.updateEvent(event.id, { status: 'processing', lastAttemptAt: new Date().toISOString() });
    }

    // 4. Get recipients
    const allSubscribers = await getActiveSubscribers();

    // Snapshot total subscribers if not set to ensure stable completion target
    let totalTarget = event.totalSubscribers;
    if (totalTarget === undefined || totalTarget === null) {
        totalTarget = allSubscribers.length;
        await queueManager.updateEvent(event.id, { totalSubscribers: totalTarget });
    }

    // Filter out those who already received it
    const recipients = allSubscribers.filter(email => !event.sentEmails.includes(email));

    if (recipients.length === 0) {
        // All sent
        await queueManager.updateEvent(event.id, { status: 'sent', lastAttemptAt: new Date().toISOString() });
        return { processed: 0, errors: 0, remaining: false };
    }

    // 5. Process Batch
    const batch = recipients.slice(0, CONFIG.batchSize);
    let processed = 0;
    let errors = 0;
    let consecutiveFailures = 0;
    const sentTo: string[] = [];

    logger.info(`[QUEUE] Processing batch of ${batch.length} emails for event ${event.id}`);

    for (const recipient of batch) {
        // Rate Limit Delay
        // 60 emails/min = 1000ms delay per email
        const msPerEmail = (60 / CONFIG.maxEmailsPerMinute) * 1000;
        await delay(msPerEmail);

        const success = await sendEmailForEvent(recipient, event);

        if (success) {
            processed++;
            sentTo.push(recipient);
            consecutiveFailures = 0;
        } else {
            errors++;
            consecutiveFailures++;
        }

        // Circuit Breaker
        if (consecutiveFailures >= CONFIG.circuitBreakerThreshold) {
            logger.error('[QUEUE] Circuit breaker tripped! Pausing queue.');
            await queueManager.pauseQueue();
            await queueManager.updateEvent(event.id, {
                status: 'failed',
                failureReason: 'Circuit breaker tripped due to consecutive provider failures.'
            });
            break;
        }
    }

    // 6. Update Event State
    const updatedSentEmails = [...event.sentEmails, ...sentTo];
    const newProcessedCount = event.processedCount + processed;

    const updates: Partial<SubscriptionEvent> = {
        sentEmails: updatedSentEmails,
        processedCount: newProcessedCount,
        lastAttemptAt: new Date().toISOString(),
    };

    // Check if completely done
    if (updatedSentEmails.length >= totalTarget) {
        updates.status = 'sent';
    }
    // If we tripped circuit breaker, status is already failed/paused
    // Otherwise leave as processing/pending

    await queueManager.updateEvent(event.id, updates);

    return {
        processed,
        errors,
        remaining: updatedSentEmails.length < totalTarget
    };
}
