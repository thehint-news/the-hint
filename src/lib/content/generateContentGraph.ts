import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { logger } from '../feedback/console-guard';

const CONTENT_DIR = path.join(process.cwd(), 'src/content');
const CACHE_DIR = path.join(process.cwd(), '.cache');
const GRAPH_PATH = path.join(CACHE_DIR, 'contentGraph.json');
const GRAPH_PATH_TMP = path.join(CACHE_DIR, 'contentGraph.json.tmp');

export interface ArticleMetadata {
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

export function generateContentGraph(): ContentGraph {
  logger.info('Generating Content Graph by scanning markdown files...');

  let imageMetadataCache: Record<string, { width: number; height: number; type: string }> = {};
  const IMAGE_METADATA_PATH = path.join(CONTENT_DIR, 'image-metadata.json');
  try {
    if (fs.existsSync(IMAGE_METADATA_PATH)) {
      imageMetadataCache = JSON.parse(fs.readFileSync(IMAGE_METADATA_PATH, 'utf-8'));
    }
  } catch (e) {
    logger.warn('Could not read image-metadata.json', e);
  }

  const graph: ContentGraph = {
    version: Date.now(),
    generatedAt: new Date().toISOString(),
    articleCount: 0,
    articles: {},
    sortedArticles: [],
    categories: {},
  };

  if (!fs.existsSync(CONTENT_DIR)) {
    logger.error(`Content directory not found at ${CONTENT_DIR}`);
    throw new Error(`Content directory not found at ${CONTENT_DIR}`);
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
      const hasWhitespace = /\s/.test(slug);
      const hasSlash = slug.includes('/');
      const hasMd = slug.toLowerCase().endsWith('.md');

      if (hasWhitespace || hasSlash || hasMd) {
        console.warn(`WARNING: Potential safety issue with slug "${slug}". Slug should not contain whitespace, slashes, or ".md".`);
      }

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

        const title = frontmatter.title;
        const date = frontmatter.date || frontmatter.publishedAt;

        if (!title || !date) {
          logger.warn(`Skipping ${category}/${slug}: Missing required frontmatter fields (title or date)`);
          continue;
        }

        const imgUrl = frontmatter.image || frontmatter.thumbnail || null;
        let imageWidth = frontmatter.imageWidth;
        let imageHeight = frontmatter.imageHeight;
        let imageType = frontmatter.imageType;

        if (imgUrl && (!imageWidth || !imageHeight || !imageType)) {
            const cached = imageMetadataCache[imgUrl];
            if (cached) {
                imageWidth = cached.width;
                imageHeight = cached.height;
                imageType = cached.type;
            }
        }

        const article: ArticleMetadata = {
          slug,
          category,
          title,
          date: String(date),
          language: "kn",
          file: `${category}/${file}`,
          image: imgUrl,
          excerpt: frontmatter.excerpt || frontmatter.description || frontmatter.subtitle || null,
          subtitle: frontmatter.subtitle || '',
          author: frontmatter.author || null,
          tags: frontmatter.tags || [],
          contentType: frontmatter.contentType || 'news',
          placement: frontmatter.placement || (frontmatter.featured ? 'lead' : 'standard'),
          isLead: frontmatter.isLead === true || frontmatter.placement === 'lead' || frontmatter.featured === true,
          updatedAt: frontmatter.updatedAt || null,
          leadMedia: frontmatter.leadMedia || null,
          imageWidth,
          imageHeight,
          imageType,
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
        throw err;
      }
    }
  }

  graph.articleCount = graph.sortedArticles.length;

  // Integrity Validation
  if (graph.articleCount === 0) {
    throw new Error('Graph generation failed: 0 articles found.');
  }

  // Sort articles by editorial priority
  graph.sortedArticles.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.date).getTime();
    const timeB = new Date(b.updatedAt || b.date).getTime();
    return timeB - timeA;
  });

  // Handle multiple lead articles
  const leadArticles = graph.sortedArticles.filter(a => a.isLead);
  if (leadArticles.length > 1) {
    console.warn('WARNING: Multiple lead articles detected. Only the most recently selected (updated) article will be used as lead.');
    let leadFound = false;
    for (const article of graph.sortedArticles) {
      if (article.isLead) {
        if (!leadFound) {
          leadFound = true;
        } else {
          article.isLead = false;
          const id = `${article.category}/${article.slug}`;
          if (graph.articles[id]) graph.articles[id].isLead = false;
        }
      }
    }
  }

  // Sort categories
  for (const cat in graph.categories) {
    graph.categories[cat].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.date).getTime();
      return timeB - timeA;
    });
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  try {
    // Atomic write to tmp file then rename
    fs.writeFileSync(GRAPH_PATH_TMP, JSON.stringify(graph, null, 2), 'utf-8');
    fs.renameSync(GRAPH_PATH_TMP, GRAPH_PATH);
    logger.info(`Content Graph generated successfully! Cached ${graph.articleCount} articles. Version: ${graph.version}`);
  } catch (err: unknown) {
    logger.error('Failed to write contentGraph.json');
    if (err instanceof Error) logger.error(err.message, err);
    throw err;
  }

  return graph;
}
