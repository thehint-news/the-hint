/**
 * Publishing Console Types
 * Shared types for the editorial console components
 */

/** Valid sections for articles */
export const SECTIONS = [
    { value: 'politics', label: 'Politics' },
    { value: 'crime', label: 'Crime' },
    { value: 'court', label: 'Court' },
    { value: 'opinion', label: 'Opinion' },
    { value: 'world-affairs', label: 'World Affairs' },
] as const;

export type SectionValue = typeof SECTIONS[number]['value'];

/** Valid content types */
export const CONTENT_TYPES = [
    { value: 'news', label: 'News' },
    { value: 'opinion', label: 'Opinion' },
] as const;

export type ContentTypeValue = typeof CONTENT_TYPES[number]['value'];

/** Placement options for homepage */
export type PlacementValue = 'lead' | 'top' | 'standard';

/** Article status */
export type StatusValue = 'draft' | 'published';

import { ContentBlock } from '@/lib/content/media-types';

/** Workspace mode - editor for writing, all for viewing article database */
export type WorkspaceMode = 'editor' | 'all';

/** Form data structure for editing */
export interface ArticleFormData {
    headline: string;
    subheadline: string;
    section: SectionValue;
    contentType: ContentTypeValue;
    bodyBlocks: ContentBlock[]; // Canonical
    body: string; // Legacy/Fallback
    tags: string;
    placement: PlacementValue;
    sources: string;
    thumbnail: string; // Thumbnail image URL
    draftId: string | null;
    status: StatusValue;
    /** For editing published articles */
    slug?: string;
    publishedAt?: string;
    lastEdited?: string;
}

/** Initial form state */
export const INITIAL_FORM_DATA: ArticleFormData = {
    headline: '',
    subheadline: '',
    section: 'politics',
    contentType: 'news',
    bodyBlocks: [],
    body: '',
    tags: '',
    placement: 'standard',
    sources: '',
    thumbnail: '',
    draftId: null,
    status: 'draft',
};

/** Article entry for the database table */
export interface ArticleEntry {
    id: string;
    title: string;
    section: SectionValue;
    status: StatusValue;
    placement: PlacementValue;
    lastEdited: string;
    publishedAt?: string;
    slug?: string;
    /** Full article data for editing */
    data: ArticleFormData;
}

/** API response structure */
export interface ApiResponse {
    success: boolean;
    message?: string;
    error?: string;
    errors?: { field: string; message: string }[];
    data?: {
        slug?: string;
        section?: string;
        url?: string;
        draftId?: string;
        savedAt?: string;
        publishedAt?: string;
        headline?: string;
        preview?: PreviewData;
        drafts?: DraftHistoryEntry[];
        articles?: ArticleEntry[];
    };
}

/** Preview data from API */
export interface PreviewData {
    headline: string;
    subheadline: string;
    section: string;
    contentType: string;
    body: string;
    bodyBlocks?: ContentBlock[];
    tags: string[];
    sources: string[];
    placement: PlacementValue;
    previewDate: string;
}

/** Draft history entry */
export interface DraftHistoryEntry {
    draftId: string;
    headline: string;
    savedAt: string;
    section: string;
    contentType: string;
}

/** Field-level errors from server */
export type FieldErrors = Record<string, string>;

/** Toast notification */
export interface ToastMessage {
    id: string;
    type: 'success' | 'error';
    message: string;
    link?: { url: string; label: string };
}
