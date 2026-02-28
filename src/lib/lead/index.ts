/**
 * Lead Story Management Module
 * 
 * Exports all utilities for managing the single lead story constraint
 * and lead media carousel functionality.
 */

export {
    // Core enforcement functions
    findCurrentLead,
    unsetLeadArticle,
    atomicallySwapLead,
    handleLeadArticleDeletion,
    validateLeadMedia,
} from './enforcement';

export type {
    CurrentLead,
    LeadEnforcementResult,
} from './enforcement';

// Re-export types from content types for convenience
export type {
    LeadStoryImage,
    LeadMedia,
} from '@/lib/content/types';

export {
    MAX_LEAD_IMAGES,
} from '@/lib/content/types';
