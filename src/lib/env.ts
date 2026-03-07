/**
 * Environment Validation Module
 *
 * Enforces strict environment variable presence at startup.
 * In production: throws a fatal error if any required var is missing.
 * In development: warns about missing vars but allows startup.
 *
 * Required Variables:
 * - Auth: AUTHORIZED_EDITOR_EMAIL, MAGIC_LINK_SECRET
 * - Git: GIT_TOKEN, GIT_REPO_OWNER, GIT_REPO_NAME
 * - Storage: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Email: RESEND_API_KEY, EMAIL_FROM
 * - App: APP_BASE_URL
 */

/** Core variables required for all environments */
const REQUIRED_CORE = [
    // Auth
    'AUTHORIZED_EDITOR_EMAIL',
    'MAGIC_LINK_SECRET',

    // Git (GitHub API)
    'GIT_TOKEN',
    'GIT_REPO_OWNER',
    'GIT_REPO_NAME',
];

/** Production-only variables (services that may not be configured in dev) */
const REQUIRED_PRODUCTION = [
    // Supabase Storage
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',

    // Email (Resend)
    'RESEND_API_KEY',
    'EMAIL_FROM',

    // App
    'APP_BASE_URL',
];

/** Subscription-specific variables (required for subscribe/unsubscribe to work) */
const REQUIRED_SUBSCRIPTION = [
    'GIT_TOKEN',
    'GIT_REPO_OWNER',
    'GIT_REPO_NAME',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'APP_BASE_URL',
];

import { logger } from './feedback';

export function validateEnv(): { valid: boolean; missing: string[] } {
    // Only validate on server
    if (typeof window !== 'undefined') return { valid: true, missing: [] };

    const isProduction = process.env.NODE_ENV === 'production';
    const allRequired = isProduction
        ? [...REQUIRED_CORE, ...REQUIRED_PRODUCTION]
        : REQUIRED_CORE;

    const missing = allRequired.filter(key => !process.env[key]);

    if (missing.length > 0 && isProduction) {
        throw new Error(
            `\n❌ FATAL: Missing required environment variables:\n` +
            missing.map(key => `   - ${key}`).join('\n') +
            `\n\nApp cannot start without these variables in production.\n`
        );
    }

    if (missing.length > 0 && !isProduction) {
        logger.warn(
            `⚠️  Missing environment variables (non-fatal in dev):\n` +
            missing.map(key => `   - ${key}`).join('\n')
        );
    }

    logger.debug('✅ Environment configuration validated.');
    return { valid: missing.length === 0, missing };
}

export function validateSubscriptionEnv(): { valid: boolean; missing: string[] } {
    if (typeof window !== 'undefined') return { valid: true, missing: [] };

    const missing = REQUIRED_SUBSCRIPTION.filter(key => !process.env[key]);
    return { valid: missing.length === 0, missing };
}
