/**
 * Git Service
 * Low-level Git operations for the editorial system.
 * 
 * RULES:
 * - All operations are atomic
 * - All operations are committed
 * - All errors are caught and translated to user-friendly messages
 * - No Git terminology exposed to frontend
 * - Repository credentials loaded from environment
 */

import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import path from 'path';
import fs from 'fs';

/** Git error types for internal classification */
export enum GitErrorType {
    CONFLICT = 'CONFLICT',
    PERMISSION = 'PERMISSION',
    NETWORK = 'NETWORK',
    NOT_FOUND = 'NOT_FOUND',
    INVALID_STATE = 'INVALID_STATE',
    UNKNOWN = 'UNKNOWN',
}

/** Custom error class for Git operations */
export class GitOperationError extends Error {
    constructor(
        message: string,
        public readonly type: GitErrorType,
        public readonly userMessage: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'GitOperationError';
    }
}

/** Result of a Git commit operation */
export interface GitCommitResult {
    success: boolean;
    commitHash?: string;
    message: string;
}

/** Result of a Git operation */
export interface GitOperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: GitOperationError;
}

/** Base path for the repository */
const REPO_BASE_PATH = process.cwd();

/** Content directories */
const CONTENT_DIR = 'src/content';
const DRAFTS_DIR = path.join(CONTENT_DIR, 'drafts');
const PUBLISHED_DIR = 'src/content'; // Published content is directly in section folders

/** Valid sections for published content */
const VALID_SECTIONS = ['politics', 'world-affairs', 'crime', 'court', 'opinion'] as const;
export type Section = typeof VALID_SECTIONS[number];

/** Git service singleton */
class GitService {
    private git: SimpleGit;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;

    constructor() {
        const options: Partial<SimpleGitOptions> = {
            baseDir: REPO_BASE_PATH,
            binary: 'git',
            maxConcurrentProcesses: 1, // Serialize operations for safety
            trimmed: true,
        };

        this.git = simpleGit(options);
    }

    /**
     * Initialize Git service and verify repository state
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initializationError) throw this.initializationError;

        try {
            // Check if we're in a Git repository
            const isRepo = await this.git.checkIsRepo();
            if (!isRepo) {
                throw new GitOperationError(
                    'Not a Git repository',
                    GitErrorType.INVALID_STATE,
                    'Content system is not properly configured.'
                );
            }

            // Configure Git author from environment variables
            const authorName = process.env.GIT_AUTHOR_NAME;
            const authorEmail = process.env.GIT_AUTHOR_EMAIL;

            if (authorName) {
                await this.git.addConfig('user.name', authorName, false, 'local');
            }
            if (authorEmail) {
                await this.git.addConfig('user.email', authorEmail, false, 'local');
            }

            // Configure remote URL if provided (for token-based auth)
            const remoteUrl = process.env.GIT_REMOTE_URL;
            if (remoteUrl) {
                try {
                    // Check if origin exists
                    const remotes = await this.git.getRemotes(true);
                    const hasOrigin = remotes.some(r => r.name === 'origin');

                    if (hasOrigin) {
                        // Update existing origin
                        await this.git.remote(['set-url', 'origin', remoteUrl]);
                    } else {
                        // Add origin
                        await this.git.addRemote('origin', remoteUrl);
                    }
                } catch (remoteError) {
                    console.warn('Could not configure Git remote:', remoteError);
                    // Non-fatal - continue without remote
                }
            }

            // Ensure drafts directory exists
            const draftsPath = path.join(REPO_BASE_PATH, DRAFTS_DIR);
            if (!fs.existsSync(draftsPath)) {
                fs.mkdirSync(draftsPath, { recursive: true });
                // Create .gitkeep to track empty directory
                fs.writeFileSync(path.join(draftsPath, '.gitkeep'), '# Keep this directory\n');
            }

            // Ensure all section directories exist
            for (const section of VALID_SECTIONS) {
                const sectionPath = path.join(REPO_BASE_PATH, PUBLISHED_DIR, section);
                if (!fs.existsSync(sectionPath)) {
                    fs.mkdirSync(sectionPath, { recursive: true });
                }
            }

            this.isInitialized = true;
        } catch (error) {
            this.initializationError = error instanceof Error ? error : new Error(String(error));
            throw this.initializationError;
        }
    }

    /**
     * Get the absolute path for a draft file
     */
    getDraftPath(draftId: string): string {
        // Sanitize draftId to prevent path traversal
        const safeDraftId = draftId.replace(/[^a-z0-9-]/gi, '');
        return path.join(REPO_BASE_PATH, DRAFTS_DIR, `${safeDraftId}.json`);
    }

    /**
     * Get the relative path for a draft file (for Git operations)
     */
    getDraftRelativePath(draftId: string): string {
        const safeDraftId = draftId.replace(/[^a-z0-9-]/gi, '');
        return path.join(DRAFTS_DIR, `${safeDraftId}.json`);
    }

    /**
     * Get the absolute path for a published article
     */
    getPublishedPath(section: Section, slug: string): string {
        const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-');
        return path.join(REPO_BASE_PATH, PUBLISHED_DIR, section, `${safeSlug}.md`);
    }

    /**
     * Get the relative path for a published article (for Git operations)
     */
    getPublishedRelativePath(section: Section, slug: string): string {
        const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-');
        return path.join(PUBLISHED_DIR, section, `${safeSlug}.md`);
    }

    /**
     * Write a file atomically
     */
    async writeFileAtomic(absolutePath: string, content: string): Promise<void> {
        const tempPath = `${absolutePath}.tmp`;
        try {
            // Ensure directory exists
            const dir = path.dirname(absolutePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write to temp file first
            fs.writeFileSync(tempPath, content, { encoding: 'utf-8' });

            // Rename (atomic on most file systems)
            fs.renameSync(tempPath, absolutePath);
        } catch (error) {
            // Cleanup temp file if it exists
            try {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    /**
     * Delete a file if it exists
     */
    async deleteFile(absolutePath: string): Promise<boolean> {
        try {
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
                return true;
            }
            return false;
        } catch (error) {
            throw new GitOperationError(
                `Failed to delete file: ${absolutePath}`,
                GitErrorType.PERMISSION,
                'We couldn\'t complete this action right now.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Stage and commit a single file
     */
    async commitFile(relativePath: string, message: string): Promise<GitCommitResult> {
        await this.initialize();

        try {
            // Stage the file
            await this.git.add(relativePath);

            // Commit
            const result = await this.git.commit(message);

            return {
                success: true,
                commitHash: result.commit,
                message: message,
            };
        } catch (error) {
            console.error('Git commit failed:', error);
            throw new GitOperationError(
                `Commit failed: ${error}`,
                GitErrorType.UNKNOWN,
                'We couldn\'t save your changes right now. Please try again.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Stage and commit multiple files atomically
     */
    async commitFiles(relativePaths: string[], message: string): Promise<GitCommitResult> {
        await this.initialize();

        try {
            // Stage all files
            for (const relativePath of relativePaths) {
                await this.git.add(relativePath);
            }

            // Commit
            const result = await this.git.commit(message);

            return {
                success: true,
                commitHash: result.commit,
                message: message,
            };
        } catch (error) {
            console.error('Git commit failed:', error);
            throw new GitOperationError(
                `Commit failed: ${error}`,
                GitErrorType.UNKNOWN,
                'We couldn\'t save your changes right now. Please try again.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Stage a file for deletion and commit
     */
    async commitDeletion(relativePath: string, message: string): Promise<GitCommitResult> {
        await this.initialize();

        try {
            // Stage the deletion
            await this.git.rm(relativePath);

            // Commit
            const result = await this.git.commit(message);

            return {
                success: true,
                commitHash: result.commit,
                message: message,
            };
        } catch (error) {
            console.error('Git delete commit failed:', error);
            throw new GitOperationError(
                `Delete commit failed: ${error}`,
                GitErrorType.UNKNOWN,
                'We couldn\'t complete this action right now. Please try again.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Push changes to the remote repository
     */
    async push(): Promise<void> {
        await this.initialize();

        try {
            await this.git.push();
        } catch (error) {
            console.error('Git push failed:', error);
            throw new GitOperationError(
                `Push failed: ${error}`,
                GitErrorType.NETWORK,
                'Changes saved locally but couldn\'t sync. Will retry automatically.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Pull latest changes from remote
     */
    async pull(): Promise<void> {
        await this.initialize();

        try {
            await this.git.pull();
        } catch (error) {
            console.error('Git pull failed:', error);
            throw new GitOperationError(
                `Pull failed: ${error}`,
                GitErrorType.NETWORK,
                'Couldn\'t fetch latest content. Using local version.',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Check if the repository has uncommitted changes
     */
    async hasUncommittedChanges(): Promise<boolean> {
        await this.initialize();
        const status = await this.git.status();
        return !status.isClean();
    }

    /**
     * Get the current branch name
     */
    async getCurrentBranch(): Promise<string> {
        await this.initialize();
        const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        return branch;
    }

    /**
     * Read a file from the repository
     */
    readFile(absolutePath: string): string | null {
        try {
            if (!fs.existsSync(absolutePath)) {
                return null;
            }
            return fs.readFileSync(absolutePath, 'utf-8');
        } catch (error) {
            console.error(`Failed to read file: ${absolutePath}`, error);
            return null;
        }
    }

    /**
     * Check if a file exists
     */
    fileExists(absolutePath: string): boolean {
        return fs.existsSync(absolutePath);
    }

    /**
     * List all files in a directory
     */
    listFiles(absolutePath: string, extension?: string): string[] {
        try {
            if (!fs.existsSync(absolutePath)) {
                return [];
            }

            const files = fs.readdirSync(absolutePath);

            if (extension) {
                return files.filter(f => f.endsWith(extension));
            }

            return files;
        } catch (error) {
            console.error(`Failed to list files: ${absolutePath}`, error);
            return [];
        }
    }

    /**
     * Translate Git errors to user-friendly messages
     */
    translateError(error: unknown): GitOperationError {
        if (error instanceof GitOperationError) {
            return error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);

        // Detect common error patterns
        if (errorMessage.includes('CONFLICT') || errorMessage.includes('conflict')) {
            return new GitOperationError(
                errorMessage,
                GitErrorType.CONFLICT,
                'Someone else may have made changes. Please refresh and try again.',
                error instanceof Error ? error : undefined
            );
        }

        if (errorMessage.includes('permission denied') || errorMessage.includes('Permission denied')) {
            return new GitOperationError(
                errorMessage,
                GitErrorType.PERMISSION,
                'You don\'t have permission to complete this action.',
                error instanceof Error ? error : undefined
            );
        }

        if (errorMessage.includes('network') || errorMessage.includes('Could not resolve')) {
            return new GitOperationError(
                errorMessage,
                GitErrorType.NETWORK,
                'Connection issue. Your changes are saved locally.',
                error instanceof Error ? error : undefined
            );
        }

        return new GitOperationError(
            errorMessage,
            GitErrorType.UNKNOWN,
            'Something went wrong. Please try again.',
            error instanceof Error ? error : undefined
        );
    }
}

// Export singleton instance
export const gitService = new GitService();
