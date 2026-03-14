import { cache } from "react";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
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
}

export interface ContentGraph {
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

    // Attempt 1: Read existing cache
    if (fs.existsSync(localPath)) {
        try {
            const rawFile = fs.readFileSync(localPath, 'utf8');
            return JSON.parse(rawFile) as ContentGraph;
        } catch (error) {
            console.error("Content graph corruption detected. Attempting recovery...", error);
        }
    }

    // Attempt 2: Auto-regeneration fallback
    try {
        console.warn("Content graph missing or corrupted. Triggering automatic regeneration...");
        
        // Execute the generation script programmatically
        execSync("npm run generate-graph", { 
            cwd: process.cwd(),
            env: { ...process.env, NODE_ENV: process.env.NODE_ENV },
            stdio: 'inherit' 
        });

        if (fs.existsSync(localPath)) {
            const rawFile = fs.readFileSync(localPath, 'utf8');
            return JSON.parse(rawFile) as ContentGraph;
        }
        
        throw new Error("Regeneration script completed but contentGraph.json is still missing.");
    } catch (error) {
        console.error("FATAL: Failed to load or regenerate the content graph. Deployment cannot proceed.", error);
        throw error;
    }
});

export const getArticleIndex = cache(async (): Promise<ArticleMetadata[]> => {
    const graph = await getContentGraph();
    return graph.sortedArticles;
});
