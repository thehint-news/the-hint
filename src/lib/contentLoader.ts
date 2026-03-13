import { cache } from "react";
import fs from "fs";
import path from "path";

const REPO_OWNER = process.env.GIT_REPO_OWNER || '';
const REPO_NAME = process.env.GIT_REPO_NAME || '';
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const RAW_INDEX_URL = `${RAW_BASE_URL}/articles/index.json`;

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
}

export interface ContentGraph {
    articles: Record<string, ArticleMetadata>;
    sortedArticles: ArticleMetadata[];
    categories: Record<string, ArticleMetadata[]>;
}

function buildGraphFromIndex(indexData: ArticleMetadata[]): ContentGraph {
    const graph: ContentGraph = { articles: {}, sortedArticles: [], categories: {} };
    for (const entry of indexData) {
        const id = `${entry.category}/${entry.slug}`;
        graph.articles[id] = entry;
        if (!graph.categories[entry.category]) {
            graph.categories[entry.category] = [];
        }
        graph.categories[entry.category].push(entry);
        graph.sortedArticles.push(entry);
    }
    graph.sortedArticles.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const cat in graph.categories) {
        graph.categories[cat].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return graph;
}

export const getContentGraph = cache(async (): Promise<ContentGraph> => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const localPath = path.join(process.cwd(), '.cache', 'contentGraph.json');
    const isLocalBuild = fs.existsSync(localPath);

    if (isDevelopment || isLocalBuild) {
        try {
            const rawFile = fs.readFileSync(localPath, 'utf8');
            return JSON.parse(rawFile) as ContentGraph;
        } catch (error) {
            console.error("Local contentGraph.json read failed. Proceeding to CDN fetch fallback.", error);
        }
    }

    try {
        const res = await fetch(RAW_INDEX_URL, { next: { revalidate: 300 } });
        if (!res.ok) {
            throw new Error(`Failed to load article index. Status: ${res.status}`);
        }
        const data = await res.json();
        return buildGraphFromIndex(data as ArticleMetadata[]);
    } catch (error) {
        console.error("Failed to load article index:", error);
        throw error;
    }
});

export const getArticleIndex = cache(async (): Promise<ArticleMetadata[]> => {
    const graph = await getContentGraph();
    return graph.sortedArticles;
});
