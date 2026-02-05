/**
 * Git Service Index
 * Exports all Git utilities for the editorial system
 */

export { gitService, GitOperationError, GitErrorType } from './service';
export type { GitCommitResult, GitOperationResult, Section } from './service';
export { contentGit } from './content';
export type {
    DraftData,
    PublishedArticleData,
    ArticleListItem,
    ContentOperationResult
} from './content';
