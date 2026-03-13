import fs from 'fs';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'articles/index.json');
const CONTENT_DIR = path.join(process.cwd(), 'src/content');
const CACHE_DIR = path.join(process.cwd(), '.cache');
const GRAPH_PATH = path.join(CACHE_DIR, 'contentGraph.json');

interface ArticleMetadata {
  slug: string;
  category: string;
  title: string;
  date: string;
  subtitle?: string;
  contentType?: 'news' | 'opinion';
  placement?: 'lead' | 'top' | 'standard';
  tags?: string[];
  image?: string | null;
  isLead?: boolean;
  updatedAt?: string | null;
}

interface ContentGraph {
  articles: Record<string, ArticleMetadata>;
  sortedArticles: ArticleMetadata[];
  categories: Record<string, ArticleMetadata[]>;
}

function runGeneration() {
  console.log('Generating Content Graph...');

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`ERROR: Failed to find index.json at ${INDEX_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(INDEX_PATH, 'utf-8');
  let indexData: ArticleMetadata[] = [];
  try {
    indexData = JSON.parse(rawData);
  } catch (err: unknown) {
    console.error('ERROR: Failed to parse index.json');
    if (err instanceof Error) console.error(err.message);
    process.exit(1);
  }

  const graph: ContentGraph = {
    articles: {},
    sortedArticles: [],
    categories: {},
  };

  for (const entry of indexData) {
    const { slug, category } = entry;
    // STEP 1 — Scan Markdown Articles (Validation)
    const mdPath = path.join(CONTENT_DIR, category, `${slug}.md`);

    if (!fs.existsSync(mdPath)) {
      console.error(`ERROR: Failed to build graph. Missing markdown file for ${category}/${slug}`);
      process.exit(1);
    }

    // Since index.json already acts as our fully extracted lightweight frontmatter cache
    // we use it directly instead of re-parsing frontmatter with regex.
    // The prompt explicitly allowed using index.json lightweight fields.
    const id = `${category}/${slug}`;
    
    // STEP 4 - Build the Content Graph
    graph.articles[id] = entry;
    
    if (!graph.categories[category]) {
      graph.categories[category] = [];
    }
    graph.categories[category].push(entry);
    graph.sortedArticles.push(entry);
  }

  // Sort global articles
  graph.sortedArticles.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Sort within categories
  for (const cat in graph.categories) {
    graph.categories[cat].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  // STEP 5 — Write Cache File
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf-8');
    console.log(`Content Graph generated successfully! Cached ${graph.sortedArticles.length} articles.`);
  } catch (err: unknown) {
    console.error('ERROR: Failed to write contentGraph.json');
    if (err instanceof Error) console.error(err.message);
    process.exit(1);
  }
}

runGeneration();
