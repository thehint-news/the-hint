import { generateContentGraph } from '../src/lib/content/generateContentGraph';
import { logger } from '../src/lib/feedback/console-guard';

try {
  generateContentGraph();
} catch (error) {
  logger.error('Failed to generate content graph', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
}

