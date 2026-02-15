/**
 * Validation Utilities Index
 * Re-exports all validation utilities for publishing system
 */

export {
    // Constants
    VALID_CONTENT_TYPES,
    VALID_SECTIONS,
    VALID_STATUSES,
    HEADLINE_MIN_LENGTH,
    MAX_TAGS,
    // Utility functions
    sanitizeString,
    sanitizeStringArray,
    normalizeTags,
    generateSlug,
    generateDraftId,
    // Validators
    isOnlyPunctuation,
    hasValidParagraph,
    isNonEmptyString,
    isValidContentType,
    isValidSection,
    isValidStatus,
    isValidPlacement,
    VALID_PLACEMENTS,
    // Main validation functions
    validateArticleInput,
    validateDraftInput,
    // Transformation functions
    transformToValidatedData,
    transformToDraftData,
} from './article';

export type {
    ContentType,
    ArticleStatus,
    Placement,
    FieldValidationError,
    ValidationResult,
    PublishArticleInput,
    DraftArticleInput,
    ValidatedArticleData,
    ValidatedDraftData,
} from './article';

// Media validation
export {
    validateMediaBlocks,
    validateImageFile,
    isValidBlockOrder,
    canInsertMediaAt,
} from './media';

export type {
    MediaValidationErrorType,
    MediaValidationWarningType,
    MediaValidationError,
    MediaValidationWarning,
    MediaValidationResult,
} from './media';

// Export Section from content types
export type { Section } from '../content/types';
