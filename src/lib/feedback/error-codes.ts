/**
 * Error Code Definitions
 * Internal error codes for the feedback system
 * 
 * ARCHITECTURE:
 * - These codes are NEVER shown to users
 * - They are used for internal logging, monitoring, and translation
 * - Each code maps to an editorial message in the translation layer
 */

/**
 * Error categories for classification
 */
export type ErrorCategory =
    | 'validation'      // User input issues
    | 'authentication'  // Access/auth issues
    | 'media'           // Image/video upload issues
    | 'network'         // Connection problems
    | 'server'          // Backend failures
    | 'content'         // Article/draft issues
    | 'unknown';        // Fallback

/**
 * Display style for errors
 */
export type ErrorDisplayStyle =
    | 'inline'          // Below the field
    | 'toast'           // Top notification
    | 'modal'           // Blocking modal
    | 'page';           // Full page message

/**
 * Error severity levels
 */
export type ErrorSeverity =
    | 'info'            // Informational, non-blocking
    | 'warning'         // Non-blocking but worth attention
    | 'error'           // Standard error
    | 'critical';       // Blocking, requires action

/**
 * Internal error codes
 * Format: CATEGORY_SPECIFIC_ISSUE
 */
export const ErrorCodes = {
    // Validation errors
    VALIDATION_MISSING_HEADLINE: 'VALIDATION_MISSING_HEADLINE',
    VALIDATION_HEADLINE_TOO_SHORT: 'VALIDATION_HEADLINE_TOO_SHORT',
    VALIDATION_HEADLINE_TOO_LONG: 'VALIDATION_HEADLINE_TOO_LONG',
    VALIDATION_HEADLINE_INVALID: 'VALIDATION_HEADLINE_INVALID',
    VALIDATION_MISSING_SUBHEADLINE: 'VALIDATION_MISSING_SUBHEADLINE',
    VALIDATION_SUBHEADLINE_TOO_LONG: 'VALIDATION_SUBHEADLINE_TOO_LONG',
    VALIDATION_MISSING_BODY: 'VALIDATION_MISSING_BODY',
    VALIDATION_BODY_EMPTY: 'VALIDATION_BODY_EMPTY',
    VALIDATION_INVALID_SECTION: 'VALIDATION_INVALID_SECTION',
    VALIDATION_INVALID_CONTENT_TYPE: 'VALIDATION_INVALID_CONTENT_TYPE',
    VALIDATION_OPINION_SECTION_MISMATCH: 'VALIDATION_OPINION_SECTION_MISMATCH',
    VALIDATION_INVALID_STATUS: 'VALIDATION_INVALID_STATUS',
    VALIDATION_INVALID_PLACEMENT: 'VALIDATION_INVALID_PLACEMENT',
    VALIDATION_INVALID_TAGS: 'VALIDATION_INVALID_TAGS',
    VALIDATION_TOO_MANY_TAGS: 'VALIDATION_TOO_MANY_TAGS',
    VALIDATION_INVALID_SOURCES: 'VALIDATION_INVALID_SOURCES',
    VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',

    // Content errors
    CONTENT_DUPLICATE_SLUG: 'CONTENT_DUPLICATE_SLUG',
    CONTENT_INVALID_SLUG: 'CONTENT_INVALID_SLUG',
    CONTENT_NOT_FOUND: 'CONTENT_NOT_FOUND',
    CONTENT_DRAFT_NOT_FOUND: 'CONTENT_DRAFT_NOT_FOUND',
    CONTENT_ARTICLE_NOT_FOUND: 'CONTENT_ARTICLE_NOT_FOUND',
    CONTENT_SAVE_FAILED: 'CONTENT_SAVE_FAILED',
    CONTENT_DELETE_FAILED: 'CONTENT_DELETE_FAILED',
    CONTENT_SECTION_CREATE_FAILED: 'CONTENT_SECTION_CREATE_FAILED',

    // Media errors
    MEDIA_UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
    MEDIA_INVALID_TYPE: 'MEDIA_INVALID_TYPE',
    MEDIA_FILE_TOO_LARGE: 'MEDIA_FILE_TOO_LARGE',
    MEDIA_MISSING_ALT: 'MEDIA_MISSING_ALT',
    MEDIA_LIMIT_EXCEEDED: 'MEDIA_LIMIT_EXCEEDED',
    MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
    MEDIA_VIDEO_INVALID_URL: 'MEDIA_VIDEO_INVALID_URL',
    MEDIA_VIDEO_UNSUPPORTED: 'MEDIA_VIDEO_UNSUPPORTED',

    // Authentication errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

    // Network errors
    NETWORK_OFFLINE: 'NETWORK_OFFLINE',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',
    NETWORK_INVALID_RESPONSE: 'NETWORK_INVALID_RESPONSE',

    // Server errors
    SERVER_INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
    SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
    SERVER_MAINTENANCE: 'SERVER_MAINTENANCE',
    SERVER_RATE_LIMITED: 'SERVER_RATE_LIMITED',
    SERVER_INVALID_JSON: 'SERVER_INVALID_JSON',


    // Unknown/fallback
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Success codes for positive feedback
 */
export const SuccessCodes = {
    // Draft operations
    DRAFT_SAVED: 'DRAFT_SAVED',
    DRAFT_DELETED: 'DRAFT_DELETED',
    DRAFT_RESTORED: 'DRAFT_RESTORED',

    // Publish operations
    ARTICLE_PUBLISHED: 'ARTICLE_PUBLISHED',
    ARTICLE_UPDATED: 'ARTICLE_UPDATED',
    ARTICLE_DELETED: 'ARTICLE_DELETED',

    // Preview
    PREVIEW_READY: 'PREVIEW_READY',

    // Media
    MEDIA_UPLOADED: 'MEDIA_UPLOADED',
    MEDIA_REMOVED: 'MEDIA_REMOVED',


    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',

    // General
    COPIED_TO_CLIPBOARD: 'COPIED_TO_CLIPBOARD',
    SETTINGS_SAVED: 'SETTINGS_SAVED',
} as const;

export type SuccessCode = typeof SuccessCodes[keyof typeof SuccessCodes];
