import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../src/lib/feedback/console-guard';

const CONTENT_DIR = path.join(process.cwd(), 'src/content');
const CACHE_DIR = path.join(process.cwd(), '.cache');
const GRAPH_PATH = path.join(CACHE_DIR, 'contentGraph.json');

// Interface aligned with src/lib/contentLoader.ts but augmented with Step 3requirements
interface ArticleMetadata {
  slug: string;
  category: string;
  title: string;
  date: string;
  language: string;
  file: string;
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
  logger.info('Generating Content Graph by scanning markdown files...');

  const graph: ContentGraph = {
    articles: {},
    sortedArticles: [],
    categories: {},
  };

  if (!fs.existsSync(CONTENT_DIR)) {
    logger.error(`Content directory not found at ${CONTENT_DIR}`);
    process.exit(1);
  }

  // Scan for category directories
  const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !['drafts', 'images', '.git', '.vscode'].includes(name));

  for (const category of categories) {
    const categoryPath = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.md'));

    for (const file of files) {
      const slug = file.replace('.md', '');
      const mdPath = path.join(categoryPath, file);

      // SLUG SAFETY VALIDATION
      // Structural checks — these indicate genuine problems
      const hasWhitespace = /\s/.test(slug);
      const hasSlash = slug.includes('/');
      const hasMd = slug.toLowerCase().endsWith('.md');

      if (hasWhitespace || hasSlash || hasMd) {
        console.warn(`WARNING: Potential safety issue with slug "${slug}". Slug should not contain whitespace, slashes, or ".md".`);
      }

      // URI-encoding round-trip check — ensures the slug survives encode/decode without corruption
      try {
        if (decodeURIComponent(encodeURIComponent(slug)) !== slug) {
          console.warn(`WARNING: slug "${slug}" does not survive URI-encoding round-trip. This may cause broken links.`);
        }
      } catch {
        console.warn(`WARNING: slug "${slug}" contains characters that cannot be URI-encoded. This will cause broken links.`);
      }

      try {
        const fileContent = fs.readFileSync(mdPath, 'utf8');
        const { data: frontmatter } = matter(fileContent);

        // Required fields verification
        const title = frontmatter.title;
        const date = frontmatter.date || frontmatter.publishedAt;

        if (!title || !date) {
          logger.warn(`Skipping ${category}/${slug}: Missing required frontmatter fields (title or date)`);
          continue;
        }

        const article: ArticleMetadata = {
          slug,
          category,
          title,
          date: String(date),
          language: "kn", // Default to Kannada
          file: `${category}/${file}`,
          image: frontmatter.image || frontmatter.thumbnail || null,
          excerpt: frontmatter.excerpt || frontmatter.description || frontmatter.subtitle || null,
          subtitle: frontmatter.subtitle || '',
          author: frontmatter.author || null,
          tags: frontmatter.tags || [],
          contentType: frontmatter.contentType || 'news',
          placement: frontmatter.placement || (frontmatter.featured ? 'lead' : 'standard'),
          isLead: frontmatter.isLead === true || frontmatter.placement === 'lead' || frontmatter.featured === true,
          updatedAt: frontmatter.updatedAt || null,
          leadMedia: frontmatter.leadMedia || null,
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
  }

  // Sort articles by editorial priority: updatedAt (last selection) then date (publishedAt)
  graph.sortedArticles.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.date).getTime();
    const timeB = new Date(b.updatedAt || b.date).getTime();
    return timeB - timeA;
  });

  // Issue 2 — MULTIPLE LEAD STORY CONFLICT
  const leadArticles = graph.sortedArticles.filter(a => a.isLead);
  if (leadArticles.length > 1) {
    console.warn('WARNING: Multiple lead articles detected. Only the most recently selected (updated) article will be used as lead.');
    let leadFound = false;
    // sortedArticles is already sorted by updatedAt DESC
    for (const article of graph.sortedArticles) {
      if (article.isLead) {
        if (!leadFound) {
          leadFound = true;
        } else {
          article.isLead = false;
          // Ensure map consistency
          const id = `${article.category}/${article.slug}`;
          if (graph.articles[id]) graph.articles[id].isLead = false;
        }
      }
    }
  }

  // Sort articles within each category by editorial priority
  for (const cat in graph.categories) {
    graph.categories[cat].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.date).getTime();
      return timeB - timeA;
    });
  }

  // Ensure CACHE_DIR exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf-8');
    logger.info(`Content Graph generated successfully! Cached ${graph.sortedArticles.length} articles.`);
  } catch (err: unknown) {
    logger.error('Failed to write contentGraph.json');
    if (err instanceof Error) logger.error(err.message, err);
    process.exit(1);
  }
}

runGeneration();
