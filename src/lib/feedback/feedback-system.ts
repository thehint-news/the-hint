/**
 * Feedback System - Core API
 * 
 * This is the main entry point for the feedback system.
 * It provides utilities for:
 * - Creating user-facing feedback from internal errors
 * - Mapping API errors to user messages
 * - Logging internal errors (development only)
 * - Detecting error patterns
 */

import {
    ErrorCodes,
    SuccessCodes,
    type ErrorCode,
    type SuccessCode,
    type ErrorCategory,
    type ErrorDisplayStyle,
} from './error-codes';
import {
    getErrorMessage,
    getSuccessMessage,
} from './translations';

/**
 * Internal error representation with full context
 * This is for logging and debugging only
 */
export interface InternalError {
    /** Internal error code */
    code: ErrorCode;
    /** Original error object if available */
    originalError?: Error | unknown;
    /** Additional context for debugging */
    context?: Record<string, unknown>;
    /** Timestamp when error occurred */
    timestamp: string;
    /** Where the error originated */
    source?: string;
    /** Request/trace ID if available */
    traceId?: string;
}

/**
 * User-facing feedback - what the user actually sees
 */
export interface UserFeedback {
    /** The message to display */
    message: string;
    /** Optional guidance */
    guidance?: string;
    /** Type of feedback */
    type: 'success' | 'error' | 'warning' | 'info';
    /** How to display it */
    displayStyle: ErrorDisplayStyle;
    /** Field to attach error to (for inline errors) */
    field?: string;
    /** Unique ID for tracking */
    id: string;
}

/**
 * Field-specific error for forms
 */
export interface FieldError {
    field: string;
    message: string;
    code?: ErrorCode;
}

/**
 * Generate a unique feedback ID
 */
function generateFeedbackId(): string {
    return `fb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create user-facing feedback from an error code
 */
export function createErrorFeedback(
    code: ErrorCode,
    field?: string,
): UserFeedback {
    const translation = getErrorMessage(code);

    return {
        id: generateFeedbackId(),
        message: translation.message,
        guidance: translation.guidance,
        type: translation.severity === 'info' ? 'info'
            : translation.severity === 'warning' ? 'warning'
                : 'error',
        displayStyle: translation.displayStyle,
        field,
    };
}

/**
 * Create user-facing feedback from a success code
 */
export function createSuccessFeedback(
    code: SuccessCode,
    customMessage?: string,
): UserFeedback {
    const translation = getSuccessMessage(code);

    return {
        id: generateFeedbackId(),
        message: customMessage || translation.message,
        type: 'success',
        displayStyle: translation.displayStyle,
    };
}

/**
 * Map field name from API to user-friendly field reference
 */
function normalizeFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
        headline: 'headline',
        title: 'headline',
        subheadline: 'subheadline',
        subtitle: 'subheadline',
        body: 'body',
        section: 'section',
        contentType: 'contentType',
        content_type: 'contentType',
        placement: 'placement',
        tags: 'tags',
        sources: 'sources',
        email: 'email',
        status: 'status',
        unknown: 'unknown',
        auth: 'auth',
        method: 'method',
    };
    return fieldMap[field] || field;
}

/**
 * Detect the error code from an API error message
 * This maps technical API messages to our internal error codes
 */
export function detectErrorCode(
    apiMessage: string,
    field?: string
): ErrorCode {
    const msg = apiMessage.toLowerCase();

    // Headline errors
    if (field === 'headline' || msg.includes('headline')) {
        if (msg.includes('required')) return ErrorCodes.VALIDATION_MISSING_HEADLINE;
        if (msg.includes('at least') || msg.includes('too short')) return ErrorCodes.VALIDATION_HEADLINE_TOO_SHORT;
        if (msg.includes('or less') || msg.includes('too long')) return ErrorCodes.VALIDATION_HEADLINE_TOO_LONG;
        if (msg.includes('alphanumeric')) return ErrorCodes.VALIDATION_HEADLINE_INVALID;
        if (msg.includes('already exists')) return ErrorCodes.CONTENT_DUPLICATE_SLUG;
    }

    // Subheadline errors
    if (field === 'subheadline' || msg.includes('subheadline')) {
        if (msg.includes('required')) return ErrorCodes.VALIDATION_MISSING_SUBHEADLINE;
        if (msg.includes('or less') || msg.includes('too long')) return ErrorCodes.VALIDATION_SUBHEADLINE_TOO_LONG;
    }

    // Body errors
    if (field === 'body' || msg.includes('body') || msg.includes('article')) {
        if (msg.includes('required')) return ErrorCodes.VALIDATION_MISSING_BODY;
        if (msg.includes('paragraph')) return ErrorCodes.VALIDATION_BODY_EMPTY;
        if (msg.includes('write')) return ErrorCodes.CONTENT_SAVE_FAILED;
    }

    // Section errors
    if (field === 'section' || msg.includes('section')) {
        if (msg.includes('must be one of') || msg.includes('valid')) return ErrorCodes.VALIDATION_INVALID_SECTION;
        if (msg.includes('directory')) return ErrorCodes.CONTENT_SECTION_CREATE_FAILED;
    }

    // Content type errors
    if (field === 'contentType' || msg.includes('content type')) {
        if (msg.includes('opinion') && msg.includes('section')) return ErrorCodes.VALIDATION_OPINION_SECTION_MISMATCH;
        if (msg.includes('must be one of')) return ErrorCodes.VALIDATION_INVALID_CONTENT_TYPE;
    }

    // Status errors
    if (field === 'status' || msg.includes('status')) {
        if (msg.includes('must be') || msg.includes('published')) return ErrorCodes.VALIDATION_INVALID_STATUS;
    }

    // Placement errors
    if (field === 'placement' || msg.includes('placement')) {
        return ErrorCodes.VALIDATION_INVALID_PLACEMENT;
    }

    // Tags errors
    if (field === 'tags' || msg.includes('tags')) {
        if (msg.includes('maximum') || msg.includes('10')) return ErrorCodes.VALIDATION_TOO_MANY_TAGS;
        return ErrorCodes.VALIDATION_INVALID_TAGS;
    }

    // Sources errors
    if (field === 'sources' || msg.includes('sources')) {
        return ErrorCodes.VALIDATION_INVALID_SOURCES;
    }

    // Slug errors
    if (msg.includes('slug')) {
        if (msg.includes('already exists')) return ErrorCodes.CONTENT_DUPLICATE_SLUG;
        return ErrorCodes.CONTENT_INVALID_SLUG;
    }

    // Auth errors
    if (field === 'auth' || msg.includes('auth') || msg.includes('unauthorized')) {
        if (msg.includes('required')) return ErrorCodes.AUTH_REQUIRED;
        if (msg.includes('credentials') || msg.includes('password')) return ErrorCodes.AUTH_INVALID_CREDENTIALS;
        if (msg.includes('session')) return ErrorCodes.AUTH_SESSION_EXPIRED;
        return ErrorCodes.AUTH_UNAUTHORIZED;
    }

    // Network errors
    if (msg.includes('network') || msg.includes('connection')) {
        if (msg.includes('offline')) return ErrorCodes.NETWORK_OFFLINE;
        if (msg.includes('timeout')) return ErrorCodes.NETWORK_TIMEOUT;
        return ErrorCodes.NETWORK_REQUEST_FAILED;
    }

    // JSON/request errors
    if (msg.includes('json') || msg.includes('invalid')) {
        return ErrorCodes.SERVER_INVALID_JSON;
    }

    // Server errors
    if (msg.includes('internal') || msg.includes('server') || msg.includes('unexpected')) {
        return ErrorCodes.SERVER_INTERNAL_ERROR;
    }

    // Media errors
    if (msg.includes('upload') || msg.includes('image') || msg.includes('file')) {
        if (msg.includes('type')) return ErrorCodes.MEDIA_INVALID_TYPE;
        if (msg.includes('large') || msg.includes('size')) return ErrorCodes.MEDIA_FILE_TOO_LARGE;
        if (msg.includes('alt')) return ErrorCodes.MEDIA_MISSING_ALT;
        return ErrorCodes.MEDIA_UPLOAD_FAILED;
    }

    // Video errors
    if (msg.includes('video')) {
        if (msg.includes('url') || msg.includes('link')) return ErrorCodes.MEDIA_VIDEO_INVALID_URL;
        if (msg.includes('support')) return ErrorCodes.MEDIA_VIDEO_UNSUPPORTED;
    }

    // Subscription errors
    if (msg.includes('subscribe') || msg.includes('email')) {
        if (msg.includes('already')) return ErrorCodes.SUBSCRIPTION_ALREADY_EXISTS;
        if (msg.includes('email') || msg.includes('valid')) return ErrorCodes.SUBSCRIPTION_INVALID_EMAIL;
        return ErrorCodes.SUBSCRIPTION_FAILED;
    }

    // Fallback
    return ErrorCodes.UNKNOWN_ERROR;
}

/**
 * Transform API error response to user-friendly field errors
 */
export function transformApiErrors(
    errors: Array<{ field: string; message: string }>
): FieldError[] {
    return errors.map(err => {
        const normalizedField = normalizeFieldName(err.field);
        const code = detectErrorCode(err.message, err.field);
        const translation = getErrorMessage(code);

        return {
            field: normalizedField,
            message: translation.message,
            code,
        };
    });
}

/**
 * Transform a single API error to user feedback
 */
export function transformApiError(
    error: { field?: string; message: string },
): UserFeedback {
    const field = error.field ? normalizeFieldName(error.field) : undefined;
    const code = detectErrorCode(error.message, error.field);
    return createErrorFeedback(code, field);
}

/**
 * Get the first (most blocking) error from a list
 * Implements progressive disclosure
 */
export function getFirstError(errors: FieldError[]): FieldError | null {
    if (errors.length === 0) return null;

    // Priority order: headline > subheadline > body > section > contentType > others
    const priorityOrder = ['headline', 'subheadline', 'body', 'section', 'contentType', 'placement'];

    for (const field of priorityOrder) {
        const error = errors.find(e => e.field === field);
        if (error) return error;
    }

    return errors[0];
}

/**
 * Create a toast message from an error
 */
export function createToastFromError(
    code: ErrorCode,
    fallbackMessage?: string,
): { type: 'error' | 'warning'; message: string; id: string } {
    const translation = getErrorMessage(code);
    const message = translation.guidance
        ? `${translation.message} ${translation.guidance}`
        : translation.message;

    return {
        id: generateFeedbackId(),
        type: translation.severity === 'warning' ? 'warning' : 'error',
        message: fallbackMessage || message,
    };
}

/**
 * Create a toast message from a success code
 */
export function createToastFromSuccess(
    code: SuccessCode,
    data?: { url?: string; label?: string },
): { type: 'success'; message: string; id: string; link?: { url: string; label: string } } {
    const translation = getSuccessMessage(code);

    return {
        id: generateFeedbackId(),
        type: 'success',
        message: translation.message,
        link: data?.url ? { url: data.url, label: data.label || 'View' } : undefined,
    };
}

// Re-export commonly used items
export { ErrorCodes, SuccessCodes };
export type { ErrorCode, SuccessCode, ErrorCategory, ErrorDisplayStyle };
