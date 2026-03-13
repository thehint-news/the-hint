import fs from 'fs';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'articles/index.json');
const CONTENT_DIR = path.join(process.cwd(), 'src/content');

interface IndexEntry {
  slug: string;
  category: string;
}

function runVerification() {
  let hasErrors = false;

  // STEP 1 — Load Article Index
  let indexData: IndexEntry[] = [];
  try {
    const rawData = fs.readFileSync(INDEX_PATH, 'utf-8');
    indexData = JSON.parse(rawData);
  } catch (err: unknown) {
    console.error(`ERROR: Failed to read or parse index.json at ${INDEX_PATH}`);
    if (err instanceof Error) {
        console.error(err.message);
    }
    process.exit(1);
  }

  const indexEntries = indexData.map((entry) => `${entry.category}/${entry.slug}`);

  // STEP 2 — Scan Markdown Files
  const markdownFiles: string[] = [];

  if (fs.existsSync(CONTENT_DIR)) {
    const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const category of categories) {
      // Ignore internal directories not serving as content sections
      if (category === 'drafts' || category === 'images') {
        continue;
      }

      const categoryPath = path.join(CONTENT_DIR, category);
      const files = fs.readdirSync(categoryPath)
        .filter((file) => file.endsWith('.md'))
        .map((file) => `${category}/${file.replace('.md', '')}`);

      markdownFiles.push(...files);
    }
  } else {
    console.error(`ERROR: Content directory not found at ${CONTENT_DIR}`);
    process.exit(1);
  }

  // STEP 3 — Compare Markdown Files vs Index Entries
  const indexSet = new Set(indexEntries);
  const markdownSet = new Set(markdownFiles);

  // CHECK A — Missing Index Entries
  const missingInIndex = markdownFiles.filter((item) => !indexSet.has(item));
  if (missingInIndex.length > 0) {
    console.error("\nERROR: Articles exist in markdown but missing in index.json");
    missingInIndex.forEach((item) => console.error(` - ${item}`));
    hasErrors = true;
  }

  // CHECK B — Missing Markdown Files
  const missingInMarkdown = indexEntries.filter((item) => !markdownSet.has(item));
  if (missingInMarkdown.length > 0) {
    console.error("\nERROR: Index references non-existent markdown files");
    missingInMarkdown.forEach((item) => console.error(` - ${item}`));
    hasErrors = true;
  }

  // STEP 4 — Detect Duplicate Articles
  const seenIndex = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of indexEntries) {
    if (seenIndex.has(entry)) {
      duplicates.add(entry);
    }
    seenIndex.add(entry);
  }

  if (duplicates.size > 0) {
    console.error("\nERROR: Duplicate article identifiers detected.");
    duplicates.forEach((item) => console.error(` - ${item}`));
    hasErrors = true;
  }

  // STEP 5 — Validate Article Count
  if (markdownFiles.length !== indexEntries.length) {
    console.error("\nERROR: Article count mismatch detected.");
    console.error(` - Markdown files: ${markdownFiles.length}`);
    console.error(` - Index entries: ${indexEntries.length}`);
    hasErrors = true;
  }

  // STEP 6 & 7 — Build Failure Behavior / Success Message
  if (hasErrors) {
    console.error("\nValidation failed.");
    process.exit(1);
  } else {
    console.log("Content index validation passed.");
  }
}

runVerification();
