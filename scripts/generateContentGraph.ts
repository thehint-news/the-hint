import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../src/lib/feedback/console-guard';

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
  excerpt?: string | null;
  author?: string | null;
  isLead?: boolean;
  updatedAt?: string | null;
  leadMedia?: unknown;
}

interface ContentGraph {
  articles: Record<string, ArticleMetadata>;
  sortedArticles: ArticleMetadata[];
  categories: Record<string, ArticleMetadata[]>;
}

function runGeneration() {
  logger.info('Generating Content Graph with Frontmatter Parsing...');

  if (!fs.existsSync(INDEX_PATH)) {
    logger.error(`Failed to find index.json at ${INDEX_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(INDEX_PATH, 'utf-8');
  let indexData: ArticleMetadata[] = [];
  try {
    indexData = JSON.parse(rawData);
  } catch (err: unknown) {
    logger.error('Failed to parse index.json');
    if (err instanceof Error) logger.error(err.message, err);
    process.exit(1);
  }

  const graph: ContentGraph = {
    articles: {},
    sortedArticles: [],
    categories: {},
  };

  for (const entry of indexData) {
    const { slug, category } = entry;
    const mdPath = path.join(CONTENT_DIR, category, `${slug}.md`);

    if (!fs.existsSync(mdPath)) {
      logger.error(`Failed to build graph. Missing markdown file for ${category}/${slug} at ${mdPath}`);
      process.exit(1);
    }

    // STEP 3 — Parse Markdown Frontmatter
    try {
      const fileContent = fs.readFileSync(mdPath, 'utf8');
      const { data: frontmatter } = matter(fileContent);

      const title = frontmatter.title || entry.title;
      const date = frontmatter.date || frontmatter.publishedAt || entry.date;

      if (!title || !date) {
        throw new Error(`Missing required frontmatter (title or date/publishedAt) in ${category}/${slug}`);
      }
      
      // STEP 4 — Build Metadata Object
      const article: ArticleMetadata = {
        slug: slug,
        category: category,
        title: title,
        date: String(date),
        image: frontmatter.image || frontmatter.thumbnail || entry.image || null,
        excerpt: frontmatter.excerpt || frontmatter.description || frontmatter.subtitle || entry.subtitle || null,
        author: frontmatter.author || entry.author || null,
        tags: frontmatter.tags || entry.tags || [],
        contentType: frontmatter.contentType || entry.contentType || 'news',
        placement: frontmatter.placement || entry.placement || (frontmatter.featured ? 'lead' : 'standard'),
        isLead: frontmatter.isLead === true || frontmatter.placement === 'lead' || frontmatter.featured === true || entry.isLead === true || entry.placement === 'lead',
        updatedAt: frontmatter.updatedAt || entry.updatedAt || null,
        subtitle: frontmatter.subtitle || entry.subtitle || '',
        leadMedia: frontmatter.leadMedia || entry.leadMedia || null,
      };

      const id = `${category}/${slug}`;
      graph.articles[id] = article;
      
      if (!graph.categories[category]) {
        graph.categories[category] = [];
      }
      graph.categories[category].push(article);
      graph.sortedArticles.push(article);

    } catch (err: unknown) {
      logger.error(`Failed to parse markdown frontmatter for ${category}/${slug}`);
      if (err instanceof Error) logger.error(err.message, err);
      process.exit(1);
    }
  }

  // STEP 5 — Preserve Article Sorting
  graph.sortedArticles.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  for (const cat in graph.categories) {
    graph.categories[cat].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  // STEP 6 — Write Content Graph
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf-8');
    logger.info(`Content Graph generated successfully! Cached ${graph.sortedArticles.length} articles with full metadata.`);
  } catch (err: unknown) {
    logger.error('Failed to write contentGraph.json');
    if (err instanceof Error) logger.error(err.message, err);
    process.exit(1);
  }
}

runGeneration();
