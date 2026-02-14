/**
 * Section Page Data Composition Module
 * 
 * Editorial logic for section landing pages.
 * All filtering, ordering, and validation logic resides here.
 * 
 * NO JSX, NO TAILWIND, NO UI LAYER IMPORTS.
 */

import { getArticlesBySection, getValidSections } from './reader';
import { Article, Section } from './types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Section metadata with display-friendly name and description
 */
export interface SectionInfo {
    /** URL-safe section identifier (slug) */
    slug: Section;
    /** Display name for the section */
    name: string;
    /** Editorial description of the section */
    description: string;
}

/**
 * Complete section page data structure
 */
export interface SectionPageData {
    /** Section metadata */
    section: SectionInfo;
    /** Articles for this section, already sorted */
    articles: Article[];
}

// ============================================================================
// SECTION METADATA
// ============================================================================

/**
 * Section display configuration
 * Maps section slugs to display names and descriptions
 */
const SECTION_META: Record<Section, { name: string; description: string }> = {
    politics: {
        name: 'Politics',
        description: 'Coverage of legislative affairs, policy decisions, and political developments.',
    },
    crime: {
        name: 'Crime',
        description: 'Reporting on criminal investigations, public safety, and law enforcement.',
    },
    court: {
        name: 'Court',
        description: 'Legal proceedings, judicial rulings, and courtroom developments.',
    },
    opinion: {
        name: 'Opinion & Analysis',
        description: 'Commentary, editorials, and in-depth analysis from our contributors.',
    },
    'world-affairs': {
        name: 'World Affairs',
        description: 'International news, global developments, and foreign policy coverage.',
    },
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Error thrown when an invalid section is requested
 */
export class InvalidSectionError extends Error {
    constructor(
        public readonly section: string,
        public readonly validSections: Section[]
    ) {
        super(
            `Invalid section: "${section}". ` +
            `Valid sections are: ${validSections.join(', ')}`
        );
        this.name = 'InvalidSectionError';
    }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid section
 */
function isValidSection(section: string): section is Section {
    const validSections = getValidSections();
    return validSections.includes(section as Section);
}

/**
 * Validate and normalize a section string
 * @throws InvalidSectionError if section is not valid
 */
function validateSection(section: string): Section {
    // Normalize: trim and lowercase
    const normalized = section.trim().toLowerCase();

    if (!isValidSection(normalized)) {
        throw new InvalidSectionError(section, getValidSections());
    }

    return normalized;
}

// ============================================================================
// DATA COMPOSITION FUNCTIONS
// ============================================================================

/**
 * Get section metadata
 */
function getSectionInfo(section: Section): SectionInfo {
    const meta = SECTION_META[section];
    return {
        slug: section,
        name: meta.name,
        description: meta.description,
    };
}

/**
 * Get articles for a section, properly sorted
 * Articles are sorted by publishedAt descending (newest first)
 */
async function getSectionArticles(section: Section): Promise<Article[]> {
    // getArticlesBySection already returns sorted articles
    return await getArticlesBySection(section);
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Get all data needed to render a section page.
 * 
 * This is the primary export of this module. It returns a deterministic
 * data structure containing everything needed to render the section page.
 * 
 * The function:
 * - Validates the section name
 * - Fetches and sorts articles
 * - Returns section metadata and articles
 * 
 * @param section - The section slug (e.g., 'politics', 'crime', 'world-affairs')
 * @returns SectionPageData object with section info and articles
 * @throws InvalidSectionError if section is not valid
 */
export async function getSectionPageData(section: string): Promise<SectionPageData> {
    // Validate section (throws if invalid)
    const validatedSection = validateSection(section);

    // Get section metadata
    const sectionInfo = getSectionInfo(validatedSection);

    // Get articles for this section
    const articles = await getSectionArticles(validatedSection);

    return {
        section: sectionInfo,
        articles,
    };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export Article type for consumers that need it
export type { Article } from './types';
