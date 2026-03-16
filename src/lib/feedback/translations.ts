/**
 * Editorial Message Translations
 * The central translation layer that converts internal error codes
 * into human-friendly, editorial-style messages.
 * 
 * DESIGN PRINCIPLES:
 * 1. Sound like a calm editor, not a machine
 * 2. Avoid technical jargon (server, API, validation, error code)
 * 3. Never blame the user
 * 4. Always provide guidance when applicable
 * 5. Keep messages concise but complete
 */

import type { ErrorCode, SuccessCode, ErrorDisplayStyle, ErrorSeverity, ErrorCategory } from './error-codes';
import { ErrorCodes, SuccessCodes } from './error-codes';

/**
 * Editorial message configuration
 */
interface EditorialMessage {
    /** The human-friendly message */
    message: string;
    /** Optional guidance on what to do next */
    guidance?: string;
    /** How to display this message */
    displayStyle: ErrorDisplayStyle;
    /** Severity level */
    severity: ErrorSeverity;
    /** Category for grouping */
    category: ErrorCategory;
}

/**
 * Success message configuration
 */
interface SuccessMessage {
    /** The positive feedback message */
    message: string;
    /** How to display this message */
    displayStyle: ErrorDisplayStyle;
}

/**
 * Error message translations
 * Maps internal error codes to editorial messages
 */
export const errorTranslations: Record<ErrorCode, EditorialMessage> = {
    // Validation - Headline
    [ErrorCodes.VALIDATION_MISSING_HEADLINE]: {
        message: 'Headline required.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_HEADLINE_TOO_SHORT]: {
        message: 'Headline too short. Minimum 10 characters.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_HEADLINE_TOO_LONG]: {
        message: 'Headline too long. Maximum 150 characters.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_HEADLINE_INVALID]: {
        message: 'Headline must contain text.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },

    // Validation - Subheadline
    [ErrorCodes.VALIDATION_MISSING_SUBHEADLINE]: {
        message: 'Subheadline required.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_SUBHEADLINE_TOO_LONG]: {
        message: 'Subheadline too long. Maximum 200 characters.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },

    // Validation - Body
    [ErrorCodes.VALIDATION_MISSING_BODY]: {
        message: 'Article body required.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_BODY_EMPTY]: {
        message: 'Add at least one paragraph.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },

    // Validation - Section & Type
    [ErrorCodes.VALIDATION_INVALID_SECTION]: {
        message: 'Select a valid section.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_INVALID_CONTENT_TYPE]: {
        message: 'Select content type: News or Opinion.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_OPINION_SECTION_MISMATCH]: {
        message: 'Opinion pieces must be in Opinion section.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_INVALID_STATUS]: {
        message: 'Invalid article status.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_INVALID_PLACEMENT]: {
        message: 'Invalid placement option.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },

    // Validation - Tags & Sources
    [ErrorCodes.VALIDATION_INVALID_TAGS]: {
        message: 'Tags must be text.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_TOO_MANY_TAGS]: {
        message: 'Maximum 10 tags allowed.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_INVALID_SOURCES]: {
        message: 'Sources must be text.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'validation',
    },
    [ErrorCodes.VALIDATION_INVALID_EMAIL]: {
        message: 'Enter a valid email.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'validation',
    },

    // Content - Duplicates & Not Found
    [ErrorCodes.CONTENT_DUPLICATE_SLUG]: {
        message: 'Article with this headline exists.',
        guidance: 'Change the headline.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'content',
    },
    [ErrorCodes.CONTENT_INVALID_SLUG]: {
        message: 'Headline must contain letters or numbers.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'content',
    },
    [ErrorCodes.CONTENT_NOT_FOUND]: {
        message: 'Content not found.',
        displayStyle: 'page',
        severity: 'error',
        category: 'content',
    },
    [ErrorCodes.CONTENT_DRAFT_NOT_FOUND]: {
        message: 'Draft not found.',
        displayStyle: 'toast',
        severity: 'warning',
        category: 'content',
    },
    [ErrorCodes.CONTENT_ARTICLE_NOT_FOUND]: {
        message: 'Article not found.',
        displayStyle: 'page',
        severity: 'error',
        category: 'content',
    },

    // Content - Save & Delete
    [ErrorCodes.CONTENT_SAVE_FAILED]: {
        message: 'Save failed. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'content',
    },
    [ErrorCodes.CONTENT_DELETE_FAILED]: {
        message: 'Delete failed. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'content',
    },
    [ErrorCodes.CONTENT_SECTION_CREATE_FAILED]: {
        message: 'Section creation failed. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'content',
    },

    // Media - Upload Issues
    [ErrorCodes.MEDIA_UPLOAD_FAILED]: {
        message: 'Upload failed. Try again.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },
    [ErrorCodes.MEDIA_INVALID_TYPE]: {
        message: 'Invalid file type. Use JPEG, PNG, WebP, or AVIF.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },
    [ErrorCodes.MEDIA_FILE_TOO_LARGE]: {
        message: 'File too large. Maximum 10MB.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },
    [ErrorCodes.MEDIA_MISSING_ALT]: {
        message: 'Image description required.',
        displayStyle: 'inline',
        severity: 'warning',
        category: 'media',
    },
    [ErrorCodes.MEDIA_LIMIT_EXCEEDED]: {
        message: 'Image limit reached. Remove one to add more.',
        displayStyle: 'toast',
        severity: 'warning',
        category: 'media',
    },
    [ErrorCodes.MEDIA_PROCESSING_FAILED]: {
        message: 'Image processing failed. Try a different file.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },
    [ErrorCodes.MEDIA_VIDEO_INVALID_URL]: {
        message: 'Invalid video URL.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },
    [ErrorCodes.MEDIA_VIDEO_UNSUPPORTED]: {
        message: 'Only YouTube and Vimeo supported.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'media',
    },

    // Authentication
    [ErrorCodes.AUTH_REQUIRED]: {
        message: 'Sign in required.',
        displayStyle: 'page',
        severity: 'info',
        category: 'authentication',
    },
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
        message: 'Wrong email or password.',
        displayStyle: 'inline',
        severity: 'error',
        category: 'authentication',
    },
    [ErrorCodes.AUTH_SESSION_EXPIRED]: {
        message: 'Session expired. Sign in again.',
        displayStyle: 'toast',
        severity: 'info',
        category: 'authentication',
    },
    [ErrorCodes.AUTH_UNAUTHORIZED]: {
        message: 'Access denied.',
        displayStyle: 'page',
        severity: 'error',
        category: 'authentication',
    },
    [ErrorCodes.AUTH_FORBIDDEN]: {
        message: 'Action not allowed.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'authentication',
    },

    // Network
    [ErrorCodes.NETWORK_OFFLINE]: {
        message: 'No internet connection.',
        displayStyle: 'toast',
        severity: 'warning',
        category: 'network',
    },
    [ErrorCodes.NETWORK_TIMEOUT]: {
        message: 'Request timed out. Try again.',
        displayStyle: 'toast',
        severity: 'warning',
        category: 'network',
    },
    [ErrorCodes.NETWORK_REQUEST_FAILED]: {
        message: 'Couldn\'t load. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'network',
    },
    [ErrorCodes.NETWORK_INVALID_RESPONSE]: {
        message: 'Invalid response. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'network',
    },

    // Server
    [ErrorCodes.SERVER_INTERNAL_ERROR]: {
        message: 'Server error. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'server',
    },
    [ErrorCodes.SERVER_UNAVAILABLE]: {
        message: 'Server unavailable. Try again shortly.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'server',
    },
    [ErrorCodes.SERVER_MAINTENANCE]: {
        message: 'Site updating. Back in a few minutes.',
        displayStyle: 'modal',
        severity: 'info',
        category: 'server',
    },
    [ErrorCodes.SERVER_RATE_LIMITED]: {
        message: 'Too many requests. Wait a moment.',
        displayStyle: 'toast',
        severity: 'warning',
        category: 'server',
    },
    [ErrorCodes.SERVER_INVALID_JSON]: {
        message: 'Invalid request. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'server',
    },


    // Unknown/Fallback
    [ErrorCodes.UNKNOWN_ERROR]: {
        message: 'An error occurred. Try again.',
        displayStyle: 'toast',
        severity: 'error',
        category: 'unknown',
    },
};

/**
 * Success message translations
 */
export const successTranslations: Record<SuccessCode, SuccessMessage> = {
    // Drafts
    [SuccessCodes.DRAFT_SAVED]: {
        message: 'Draft saved',
        displayStyle: 'toast',
    },
    [SuccessCodes.DRAFT_DELETED]: {
        message: 'Draft deleted',
        displayStyle: 'toast',
    },
    [SuccessCodes.DRAFT_RESTORED]: {
        message: 'Draft restored',
        displayStyle: 'toast',
    },

    // Publishing
    [SuccessCodes.ARTICLE_PUBLISHED]: {
        message: 'Published.',
        displayStyle: 'toast',
    },
    [SuccessCodes.ARTICLE_UPDATED]: {
        message: 'Article updated',
        displayStyle: 'toast',
    },
    [SuccessCodes.ARTICLE_DELETED]: {
        message: 'Article deleted',
        displayStyle: 'toast',
    },

    // Preview
    [SuccessCodes.PREVIEW_READY]: {
        message: 'Preview ready',
        displayStyle: 'toast',
    },

    // Media
    [SuccessCodes.MEDIA_UPLOADED]: {
        message: 'Image uploaded',
        displayStyle: 'toast',
    },
    [SuccessCodes.MEDIA_REMOVED]: {
        message: 'Media removed',
        displayStyle: 'toast',
    },


    // Auth
    [SuccessCodes.LOGIN_SUCCESS]: {
        message: 'Welcome back',
        displayStyle: 'toast',
    },
    [SuccessCodes.LOGOUT_SUCCESS]: {
        message: 'You\'ve been signed out',
        displayStyle: 'toast',
    },

    // General
    [SuccessCodes.COPIED_TO_CLIPBOARD]: {
        message: 'Copied to clipboard',
        displayStyle: 'toast',
    },
    [SuccessCodes.SETTINGS_SAVED]: {
        message: 'Settings saved',
        displayStyle: 'toast',
    },
};

/**
 * Get the editorial message for an error code
 */
export function getErrorMessage(code: ErrorCode): EditorialMessage {
    return errorTranslations[code] || errorTranslations[ErrorCodes.UNKNOWN_ERROR];
}

/**
 * Get the success message for a success code
 */
export function getSuccessMessage(code: SuccessCode): SuccessMessage {
    return successTranslations[code] || { message: 'Done', displayStyle: 'toast' };
}

/**
 * Get the full display text (message + guidance if available)
 */
export function getFullErrorText(code: ErrorCode): string {
    const msg = getErrorMessage(code);
    return msg.guidance ? `${msg.message} ${msg.guidance}` : msg.message;
}
