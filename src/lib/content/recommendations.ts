/**
 * Recommendation Logic Module
 * 
 * Orchestrates article recommendations for the "Continue Reading" section.
 * STRICTLY FOLLOWS EDITORIAL RULES:
 * 1. Lead Story (Global Priority)
 * 2. Top Story (Editorial Pick)
 * 3. Same Section (Contextual Continuity)
 */

import { getHomepageData } from './homepage';
import { getArticlesBySection } from './reader';
import { Article, Section } from './types';

export interface Recommendation {
    article: Article;
    label: string;
    type: 'lead' | 'top' | 'section';
}

/**
 * Get curated recommendations for a specific article
 * @param currentArticle - The article currently being read
 */
export async function getContinueReadingArticles(currentArticle: Article): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const usedIds = new Set<string>();

    // Add current article to used IDs to prevent self-recommendation
    usedIds.add(currentArticle.id);

    // Get fresh homepage data for Lead and Top stories
    // This ensures we're always showing the latest newsroom priorities
    const homepageData = await getHomepageData();

    // 1️⃣ LEAD STORY (Global Priority)
    // Rule: Exclude if current article is the lead
    if (homepageData.leadStory && !usedIds.has(homepageData.leadStory.id)) {
        recommendations.push({
            article: homepageData.leadStory,
            label: 'Lead Story',
            type: 'lead'
        });
        usedIds.add(homepageData.leadStory.id);
    }

    // 2️⃣ TOP STORY (Editorial Pick)
    // Rule: Use one Top Story. Exclude current & lead.
    // Homepage topStories are already sorted by editorial priority

    // Get all valid Top Story candidates
    const topCandidates = homepageData.topStories.filter(story => !usedIds.has(story.id));

    // Always try to add at least one Top Story (Slot 2 intent)
    if (topCandidates.length > 0) {
        const primaryTop = topCandidates[0];
        recommendations.push({
            article: primaryTop,
            label: 'Top Story',
            type: 'top'
        });
        usedIds.add(primaryTop.id);
    }

    // 3️⃣ SAME SECTION (Recent Article)
    // Rule: Most recent article from same section. Exclude current.
    try {
        const sectionArticles = await getArticlesBySection(currentArticle.section);
        const sectionStory = sectionArticles.find(story => !usedIds.has(story.id));

        if (sectionStory) {
            // Format section name for label (e.g., "politics" -> "Politics")
            const sectionName = getSectionDisplayName(currentArticle.section);

            recommendations.push({
                article: sectionStory,
                label: `More from ${sectionName}`,
                type: 'section'
            });
            usedIds.add(sectionStory.id);
        }
    } catch (error) {
        console.warn(`Failed to fetch section articles for recommendations: ${error}`);
    }

    // 4️⃣ FILLER (If < 3 items) - REMOVED per strict editorial rules
    // Rule: "If fewer stories are available: Show fewer cards. Do not backfill with unrelated content"

    // Final check: Never exceed 3 items
    return recommendations.slice(0, 3);
}

/**
 * Helper to get display name for section
 */
function getSectionDisplayName(slug: Section): string {
    const names: Record<Section, string> = {
        'politics': 'Politics',
        'crime': 'Crime',
        'court': 'Court',
        'world-affairs': 'World Affairs',
        'opinion': 'Opinion',
        'local': 'Local'
    };
    return names[slug] || slug;
}
