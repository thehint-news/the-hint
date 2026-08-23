import { cache } from "react";
import fs from "fs";
import path from "path";
import { LeadMedia } from "./content/types";

export interface ArticleMetadata {
    slug: string;
    title: string;
    date: string;
    category: string;
    language: string;
    file: string;
    subtitle?: string;
    contentType?: 'news' | 'opinion';
    placement?: 'lead' | 'top' | 'standard';
    tags?: string[];
    image?: string | null;
    isLead?: boolean;
    updatedAt?: string | null;
    leadMedia?: LeadMedia;
    excerpt?: string | null;
    imageWidth?: number;
    imageHeight?: number;
    imageType?: string;
}

export interface ContentGraph {
    version: number;
    generatedAt: string;
    articleCount: number;
    articles: Record<string, ArticleMetadata>;
    sortedArticles: ArticleMetadata[];
    categories: Record<string, ArticleMetadata[]>;
}

/**
 * Loads the content graph from the local cache.
 * Implements Fallback Regeneration (Issue 3) and react cache (Issue 5).
 */
export const getContentGraph = cache(async (): Promise<ContentGraph> => {
    const localPath = path.join(process.cwd(), '.cache', 'contentGraph.json');

    if (!fs.existsSync(localPath)) {
        throw new Error(`Content graph missing at ${localPath}. Run generate-graph script first.`);
    }

    try {
        const rawFile = fs.readFileSync(localPath, 'utf8');
        return JSON.parse(rawFile) as ContentGraph;
    } catch (error) {
        console.error("FATAL: Failed to load the content graph. Deployment cannot proceed.", error);
        throw new Error("Content graph corrupted or unreadable.");
    }
});

export const getArticleIndex = cache(async (): Promise<ArticleMetadata[]> => {
    const graph = await getContentGraph();
    return graph.sortedArticles;
});
