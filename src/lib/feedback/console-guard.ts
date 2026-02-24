/**
 * Console Guard
 * Production logging protection
 * 
 * RULES:
 * - In production: No raw errors, stack traces, or debug logs
 * - In development: Full technical detail allowed
 * - Separation is enforced automatically
 */

import { InternalError } from './feedback-system';
import type { ErrorCode } from './error-codes';

/**
 * Check if we're in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if we're in development
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Internal logger for debugging (development only)
 * In production, these are silently suppressed
 */
export const logger = {
    /**
     * Log debug information (development only)
     */
    debug: (message: string, data?: unknown): void => {
        if (isDevelopment) {
            console.log(`[DEBUG] ${message}`, data ?? '');
        }
    },

    /**
     * Log informational messages
     */
    info: (message: string, data?: unknown): void => {
        const payload = data !== undefined ? data : '';
        console.info(`[INFO] ${message}`, payload);
    },

    /**
     * Log warnings (development only)
     */
    warn: (message: string, data?: unknown): void => {
        if (isDevelopment) {
            console.warn(`[WARN] ${message}`, data ?? '');
        }
    },

    /**
     * Log errors with full details (development only)
     * In production, logs minimal info for monitoring
     */
    error: (message: string, error?: Error | unknown, context?: Record<string, unknown>): void => {
        if (isDevelopment) {
            console.error(`[ERROR] ${message}`, error, context ?? {});
        } else {
            // In production, only log the message and code for monitoring
            // No stack traces, no sensitive data
            const safeContext = context ? {
                code: context.code,
                source: context.source,
                timestamp: new Date().toISOString(),
            } : {};
            console.error(`[ERROR] ${message}`, safeContext);
        }
    },

    /**
     * Log an internal error for debugging
     */
    internal: (error: InternalError): void => {
        if (isDevelopment) {
            console.error('[INTERNAL ERROR]', error);
        }
        // In production, could send to monitoring service
    },
};

/**
 * Create a structured internal error for logging
 */
export function createInternalError(
    code: ErrorCode,
    originalError?: Error | unknown,
    context?: Record<string, unknown>,
    source?: string,
): InternalError {
    return {
        code,
        originalError,
        context,
        timestamp: new Date().toISOString(),
        source,
        traceId: generateTraceId(),
    };
}

/**
 * Generate a trace ID for error tracking
 */
function generateTraceId(): string {
    return `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Safe stringify for logging (removes circular references)
 */
export function safeStringify(obj: unknown, indent?: number): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        // Don't log sensitive fields
        if (['password', 'token', 'secret', 'key', 'authorization'].includes(key.toLowerCase())) {
            return '[REDACTED]';
        }
        return value;
    }, indent);
}

/**
 * Extract safe error info for logging
 * Strips sensitive data from error objects
 */
export function extractSafeErrorInfo(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        if (isDevelopment) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        // In production, only name and message
        return {
            name: error.name,
            message: error.message,
        };
    }

    if (typeof error === 'string') {
        return { message: error };
    }

    if (typeof error === 'object' && error !== null) {
        // Extract only safe properties
        const safeProps: Record<string, unknown> = {};
        const obj = error as Record<string, unknown>;

        if (obj.message) safeProps.message = obj.message;
        if (obj.code) safeProps.code = obj.code;
        if (obj.status) safeProps.status = obj.status;

        return safeProps;
    }

    return { type: typeof error };
}

/**
 * Suppress console methods in production
 * Call this once at app initialization if strict console suppression is needed
 */
export function enforceProductionConsole(): void {
    if (!isProduction) return;

    // Store original methods for internal use
    const originalConsole = {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        trace: console.trace,
    };

    // Replace with no-ops or filtered versions
    console.log = () => { };
    console.debug = () => { };
    console.trace = () => { };

    // Keep warn and error but filter them
    console.warn = (...args: unknown[]) => {
        // Only log if it starts with our marker
        if (typeof args[0] === 'string' && args[0].startsWith('[')) {
            originalConsole.warn(...args);
        }
    };

    console.error = (...args: unknown[]) => {
        // Only log if it starts with our marker
        if (typeof args[0] === 'string' && args[0].startsWith('[')) {
            originalConsole.error(...args);
        }
    };

    // Keep info for monitoring purposes
    console.info = (...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].startsWith('[')) {
            originalConsole.info(...args);
        }
    };
}
