/**
 * Draft Storage System (Git-Backed)
 * 
 * This module provides backward-compatible functions for draft management,
 * now backed by Git for version control and history.
 * 
 * All drafts are stored in /content/drafts/{draftId}.json
 * Each operation results in a Git commit.
 */

import { contentGit, DraftData } from '../git';
import { logger } from '@/lib/feedback/console-guard';
import { ValidatedDraftData, Section, ContentType, Placement } from '../validation';

/** Draft metadata for history - backward compatible interface */
export interface DraftHistoryEntry {
    draftId: string;
    headline: string;
    savedAt: string;
    section: string;
    contentType: string;
}

/**
 * Save a draft (Git-backed)
 * Overwrites existing draft with same ID
 * Creates a Git commit: "Draft created/updated: {{headline}}"
 */
export async function saveDraft(draft: ValidatedDraftData): Promise<{ success: boolean; draftId: string; error?: string }> {
    try {
        const result = await contentGit.createDraft(
            {
                headline: draft.headline,
                subheadline: draft.subheadline,
                section: draft.section,
                contentType: draft.contentType,
                body: draft.body,
                tags: draft.tags,
                sources: draft.sources,
                placement: draft.placement,
                thumbnail: draft.thumbnail,
            },
            draft.draftId
        );

        if (!result.success) {
            return {
                success: false,
                draftId: draft.draftId,
                error: result.userMessage,
            };
        }

        return {
            success: true,
            draftId: result.data?.draftId || draft.draftId,
        };
    } catch (error) {
        logger.error('Failed to save draft', error);
        return {
            success: false,
            draftId: draft.draftId,
            error: 'We couldn\'t save this draft right now.',
        };
    }
}

/**
 * Load a draft by ID (Git-backed)
 */
export async function loadDraft(draftId: string): Promise<ValidatedDraftData | null> {
    try {
        const result = await contentGit.loadDraft(draftId);

        if (!result.success || !result.data) {
            return null;
        }

        // Transform to ValidatedDraftData format
        const draft = result.data;
        return {
            draftId: draft.draftId,
            headline: draft.headline,
            subheadline: draft.subheadline,
            section: draft.section as Section,
            contentType: draft.contentType as ContentType,
            body: draft.body,
            tags: draft.tags,
            sources: draft.sources,
            placement: draft.placement as Placement,
            savedAt: draft.savedAt,
            thumbnail: draft.thumbnail,
        };
    } catch (error) {
        logger.error('Failed to load draft', error);
        return null;
    }
}

/**
 * Delete a draft by ID (Git-backed)
 * Creates a Git commit: "Draft deleted: {{headline}}"
 */
export async function deleteDraft(draftId: string): Promise<boolean> {
    try {
        const result = await contentGit.deleteDraft(draftId);
        return result.success;
    } catch (error) {
        logger.error('Failed to delete draft', error);
        return false;
    }
}

/**
 * Get draft history - chronological list of all saved drafts
 * Sorted by savedAt (newest first)
 */
export async function getDraftHistory(): Promise<DraftHistoryEntry[]> {
    try {
        const result = await contentGit.listDrafts();

        if (!result.success || !result.data) {
            return [];
        }

        return result.data.map((draft: DraftData) => ({
            draftId: draft.draftId,
            headline: draft.headline,
            savedAt: draft.savedAt,
            section: draft.section,
            contentType: draft.contentType,
        }));
    } catch (error) {
        logger.error('Failed to get draft history', error);
        return [];
    }
}

/**
 * Check if a draft ID exists (Git-backed)
 */
export async function draftExists(draftId: string): Promise<boolean> {
    return await contentGit.draftExists(draftId);
}
