/**
 * Homepage Data Composition Module
 * 
 * Editorial judgment encoded as pure, deterministic data functions.
 * This module orchestrates article selection for homepage display
 * following strict newsroom editorial rules.
 * 
 * NO JSX, NO TAILWIND, NO UI LAYER IMPORTS.
 */

import { getAllArticles } from './reader';
import { Article, Section } from './types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Section blocks for homepage layout
 * Each section contains curated articles based on editorial rules
 */
export interface HomepageSections {
    crime: Article[];
    court: Article[];
    politics: Article[];
    worldAffairs: Article[];
    opinion: Article[];
}

/**
 * Complete homepage data structure
 * Represents the editorial curation for the homepage
 */
export interface HomepageData {
    /** The featured lead story, or null if none qualifies */
    leadStory: Article | null;

    /** Top stories excluding lead and opinion, max 5 */
    topStories: Article[];

    /** Section-specific article blocks */
    sections: HomepageSections;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an article is an opinion piece
 */
function isOpinion(article: Article): boolean {
    return article.contentType === 'opinion';
}

/**
 * Check if an article has a specific placement
 */
function isPlacement(article: Article, placement: 'lead' | 'top'): boolean {
    return article.placement === placement;
}

/**
 * Sort articles by date descending (newest published first).
 * Uses strictly 'publishedAt' and ignores 'updatedAt'.
 * Returns a new sorted array, does not mutate input.
 */
function sortByPublishedAtDesc(articles: Article[]): Article[] {
    return [...articles].sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();

        // Validate dates
        if (isNaN(dateA)) {
            console.warn(`Invalid date for article "${a.id}"`);
            return 1; // Push invalid dates to the end
        }
        if (isNaN(dateB)) {
            console.warn(`Invalid date for article "${b.id}"`);
            return -1;
        }

        return dateB - dateA;
    });
}

/**
 * Filter articles by section
 */
function filterBySection(articles: Article[], section: Section): Article[] {
    return articles.filter(article => article.section === section);
}



/**
 * Take first N articles from array
 */
function takeFirst(articles: Article[], count: number): Article[] {
    if (count < 0) {
        throw new Error(`takeFirst: count must be non-negative, got ${count}`);
    }
    return articles.slice(0, count);
}

// ============================================================================
// EDITORIAL SELECTION FUNCTIONS
// ============================================================================

/**
 * Select the lead story based on editorial rules:
 * - Must have isLead === true (new canonical field)
 * - Falls back to placement='lead' for legacy compatibility
 * - If multiple, choose most recently published
 * - If none, return null
 * 
 * MIGRATION NOTE: During transition period, both isLead and placement='lead' 
 * are checked. After full migration, only isLead will be used.
 */
function selectLeadStory(articles: Article[]): Article | null {
    // Primary: Check for isLead === true (new canonical field)
    const isLeadCandidates = articles.filter(article => article.isLead === true);

    if (isLeadCandidates.length > 0) {
        // Sort by publishedAt descending and take the first
        const sorted = sortByPublishedAtDesc(isLeadCandidates);
        return sorted[0];
    }

    // Fallback: Check for placement='lead' (legacy compatibility)
    const placementCandidates = articles.filter(
        article => isPlacement(article, 'lead')
    );

    if (placementCandidates.length === 0) {
        return null;
    }

    // Sort by publishedAt descending and take the first
    const sorted = sortByPublishedAtDesc(placementCandidates);
    return sorted[0];
}

// ============================================================================
// MAIN COMPOSITION FUNCTION
// ============================================================================

/**
 * Compose all homepage data according to editorial rules.
 * 
 * This is the primary export of this module. It returns a deterministic
 * data structure representing editorial curation for the homepage.
 * 
 * Editorial Rules Applied:
 * 
 * LEAD STORY:
 * - Must have placement === 'lead'
 * - Must not be opinion
 * - Most recently published among lead candidates
 * - Returns null if none qualify
 * 
 * TOP STORIES:
 * - Excludes lead story
 * - Excludes opinion
 * - Prioritizes placement === 'top'
 * - Fill with standard articles (sorted by date)
 * - Maximum 5 articles
 * 
 * SECTION BLOCKS (Crime, Court, Politics, World Affairs):
 * - Latest 3 articles from each section
 * - Excludes opinion
 * - Excludes lead story
 * 
 * OPINION SECTION:
 * - Latest 3 opinion articles
 * - Only contentType === "opinion"
 * 
 * @returns HomepageData object with all curated content
 * @throws Error if article data is malformed (invalid dates)
 */
export async function getHomepageData(): Promise<HomepageData> {
    // Fetch all articles from the content reader
    const allArticles = await getAllArticles();

    // Validate we have articles to work with
    if (!Array.isArray(allArticles)) {
        throw new Error(
            'getHomepageData: getAllArticles() did not return an array'
        );
    }

    // Track used article IDs to prevent duplicates across blocks
    const usedIds = new Set<string>();

    // Helper to mark articles as used
    const markUsed = (articles: Article[]): void => {
        articles.forEach(a => usedIds.add(a.id));
    };

    // Helper to filter out already-used articles
    const excludeUsed = (articles: Article[]): Article[] => {
        return articles.filter(a => !usedIds.has(a.id));
    };

    // Select lead story
    const leadStory = selectLeadStory(allArticles);
    if (leadStory) {
        usedIds.add(leadStory.id);
    }

    // Select top stories (excluding lead story via usedIds)
    // Allow opinion ONLY if explicitly placed as 'top'
    const topStoryCandidates = excludeUsed(
        allArticles.filter(a => !isOpinion(a) || isPlacement(a, 'top'))
    );

    // Sort by placement='top' priority, then editorial priority (updatedAt fallback to publishedAt)
    const sortedTopStories = [...topStoryCandidates].sort((a, b) => {
        const isTopA = isPlacement(a, 'top');
        const isTopB = isPlacement(b, 'top');

        if (isTopA && !isTopB) return -1;
        if (!isTopA && isTopB) return 1;

        const dateA = new Date(a.updatedAt || a.publishedAt).getTime();
        const dateB = new Date(b.updatedAt || b.publishedAt).getTime();
        return dateB - dateA;
    });

    const topStories = takeFirst(sortedTopStories, 2);
    markUsed(topStories);

    // Build section blocks (each excluding previously used articles)
    const selectSectionWithDedup = (section: Section, count: number): Article[] => {
        const candidates = excludeUsed(
            filterBySection(allArticles, section).filter(a => !isOpinion(a))
        );
        const selected = takeFirst(sortByPublishedAtDesc(candidates), count);
        markUsed(selected);
        return selected;
    };

    // Opinion is separate - only excludes other opinion articles already used
    const selectOpinionWithDedup = (): Article[] => {
        const candidates = excludeUsed(
            allArticles.filter(a => isOpinion(a))
        );
        const selected = takeFirst(sortByPublishedAtDesc(candidates), 5); // UI uses 4, fetching 5 for safety
        markUsed(selected);
        return selected;
    };

    // Select World Affairs articles sorted ONLY by publishedAt (latest uploaded article)
    const selectWorldAffairsWithDedup = (count: number): Article[] => {
        const candidates = excludeUsed(
            filterBySection(allArticles, 'world-affairs').filter(a => !isOpinion(a))
        );
        // Sort explicitly by latest uploaded (publishedAt) ignoring updatedAt
        const sorted = [...candidates].sort((a, b) => {
            const dateA = new Date(a.publishedAt).getTime();
            const dateB = new Date(b.publishedAt).getTime();
            return dateB - dateA;
        });
        const selected = takeFirst(sorted, count);
        markUsed(selected);
        return selected;
    };

    const sections: HomepageSections = {
        crime: selectSectionWithDedup('crime', 6), // UI uses 5
        court: selectSectionWithDedup('court', 6), // UI uses 5
        politics: selectSectionWithDedup('politics', 5), // UI uses 4
        worldAffairs: selectWorldAffairsWithDedup(3), // UI uses 2
        opinion: selectOpinionWithDedup(),
    };

    return {
        leadStory,
        topStories,
        sections,
    };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export Article type for consumers that need it
export type { Article } from './types';
