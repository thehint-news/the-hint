import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'src/content');

function runVerification() {
  let hasErrors = false;
  let articleCount = 0;

  console.log('Verifying Markdown content metadata...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`ERROR: Content directory not found at ${CONTENT_DIR}`);
    process.exit(1);
  }

  const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter(name => !['drafts', 'images', '.git', '.vscode'].includes(name));

  for (const category of categories) {
    const categoryPath = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.md'));

    for (const file of files) {
      articleCount++;
      const mdPath = path.join(categoryPath, file);
      const relativePath = `src/content/${category}/${file}`;

      try {
        const fileContent = fs.readFileSync(mdPath, 'utf8');
        const { data: frontmatter } = matter(fileContent);

        if (!frontmatter.title) {
          console.error(`ERROR: Missing frontmatter field 'title' in ${relativePath}`);
          hasErrors = true;
        }

        const date = frontmatter.date || frontmatter.publishedAt;
        if (!date) {
          console.error(`ERROR: Missing frontmatter field 'date' in ${relativePath}`);
          hasErrors = true;
        }
      } catch (err: unknown) {
        console.error(`ERROR: Failed to parse markdown frontmatter in ${relativePath}`);
        if (err instanceof Error) console.error(err.message);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error("\nContent validation failed.");
    process.exit(1);
  } else {
    console.log(`\nContent validation passed. Verified ${articleCount} articles.`);
  }
}

runVerification();
