/**
 * Git Service
 * Git operations using Octokit (GitHub API).
 * Replaces simple-git/fs for serverless compatibility.
 * 
 * RULES:
 * - All operations are atomic via API
 * - No local filesystem write persistence
 * - Repository credentials loaded from environment
 */

import { Octokit } from 'octokit';
import path from 'path';
import { logger } from '../feedback';

/** Git error types for internal classification */
export enum GitErrorType {
    CONFLICT = 'CONFLICT',
    PERMISSION = 'PERMISSION',
    NETWORK = 'NETWORK',
    NOT_FOUND = 'NOT_FOUND',
    INVALID_STATE = 'INVALID_STATE',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
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

export interface GitCommitResult {
    success: boolean;
    commitHash?: string;
    message: string;
}

/** Staging area for atomic operations */
export interface GitStaging {
    pendingWrites: Map<string, string | Buffer>;
    pendingDeletes: Set<string>;
}

/** Helper to create a new staging context */
export function createGitStaging(): GitStaging {
    return {
        pendingWrites: new Map(),
        pendingDeletes: new Set(),
    };
}

const REPO_OWNER = process.env.GIT_REPO_OWNER || '';
const REPO_NAME = process.env.GIT_REPO_NAME || '';

if (!REPO_OWNER || !REPO_NAME) {
    logger.warn('[GIT-SERVICE] Warning: GIT_REPO_OWNER or GIT_REPO_NAME missing. Git operations will fail.');
}
const BRANCH = 'main';

/** Valid sections for published content */
export const VALID_SECTIONS = ['politics', 'world-affairs', 'crime', 'court', 'opinion', 'local'] as const;
export type Section = typeof VALID_SECTIONS[number];

class GitService {
    private _octokit: Octokit | undefined;

    constructor() { }

    private get octokit(): Octokit {
        if (!this._octokit) {
            const token = process.env.GIT_TOKEN;
            if (!token) {
                throw new Error('[GIT-SERVICE] Missing GIT_TOKEN environment variable.');
            }
            this._octokit = new Octokit({
                auth: token,
                request: {
                    fetch: (url: string, opts: RequestInit) => {
                        return fetch(url, {
                            ...opts,
                        });
                    }
                }
            });
        }
        return this._octokit;
    }

    // Helper to get relative path
    private getRelativePath(absolutePath: string): string {
        if (path.isAbsolute(absolutePath)) {
            // Strip up to (and including) root, or just take 'src' onwards if in project
            const rel = path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
            return rel;
        }
        return absolutePath.replace(/\\/g, '/');
    }

    // Path helpers mapping to virtual structure
    getDraftPath(draftId: string): string {
        return path.join(process.cwd(), 'src/content/drafts', `${draftId}.json`);
    }

    getDraftRelativePath(draftId: string): string {
        return `src/content/drafts/${draftId}.json`;
    }

    getPublishedPath(section: string, slug: string): string {
        return path.join(process.cwd(), 'src/content', section, `${slug}.md`);
    }

    getPublishedRelativePath(section: string, slug: string): string {
        return `src/content/${section}/${slug}.md`;
    }

    async initialize() {
        // No-op for API client
    }

    async getCurrentBranch(): Promise<string> {
        return BRANCH;
    }

    async hasUncommittedChanges(staging?: GitStaging): Promise<boolean> {
        if (!staging) return false;
        return staging.pendingWrites.size > 0 || staging.pendingDeletes.size > 0;
    }

    /**
     * Read file content from GitHub API
     */
    async readFile(filePath: string, staging?: GitStaging): Promise<string | null> {
        try {
            const relPath = this.getRelativePath(filePath);

            // Check pending writes first (consistency within transaction scope)
            if (staging && staging.pendingWrites.has(relPath)) {
                const pending = staging.pendingWrites.get(relPath);
                if (Buffer.isBuffer(pending)) {
                    return pending.toString('utf-8');
                }
                return pending !== undefined ? (pending as string) : null;
            }
            if (staging && staging.pendingDeletes.has(relPath)) {
                return null;
            }

            if (staging && staging.pendingDeletes.has(relPath)) {
                return null;
            }

            const client = this.octokit; // Access getter
            const response = await client.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relPath,
                ref: BRANCH,
            });


            if (Array.isArray(response.data)) return null;

            if ('content' in response.data && response.data.content) {
                return Buffer.from(response.data.content, 'base64').toString('utf-8');
            }
            return null;
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            if (err.status === 404) return null;
            logger.error(`Git readFile error for ${filePath}: ${err.message || String(error)}`);
            return null;
        }
    }

    async fileExists(filePath: string, staging?: GitStaging): Promise<boolean> {
        return (await this.readFile(filePath, staging)) !== null;
    }

    async listFiles(dirPath: string, extension?: string): Promise<string[]> {
        try {
            const relPath = this.getRelativePath(dirPath);
            const client = this.octokit;
            const response = await client.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relPath,
                ref: BRANCH,
            });

            if (!Array.isArray(response.data)) return [];

            let files = response.data
                .filter(item => item.type === 'file')
                .map(item => item.name);

            if (extension) {
                files = files.filter(f => f.endsWith(extension));
            }
            return files;
        } catch (error: unknown) {
            const err = error as { status?: number };
            if (err.status === 404) return [];
            return [];
        }
    }

    async listFilesWithContent(dirPath: string, extension?: string): Promise<{ name: string; content: string; sha: string }[]> {
        try {
            const relPath = this.getRelativePath(dirPath);
            const client = this.octokit;
            const response = await client.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relPath,
                ref: BRANCH,
            });

            if (!Array.isArray(response.data)) return [];

            let files = response.data.filter(item => item.type === 'file');
            if (extension) {
                files = files.filter(item => item.name.endsWith(extension));
            }

            const results = await Promise.all(files.map(async (file) => {
                try {
                    // Reuse getFileInfo to handle the reading + decoding
                    // We construct the full path by joining the input dirPath with the filename
                    // Since file.name is just the name, and getFileInfo expects a path (absolute or relative)
                    // We can reuse getFileInfo but we need to pass a path. 
                    // Let's us getRelativePath logic inside getFileInfo by passing a constructed path.
                    // Or we can just call the API directly here to avoid double path parsing? 
                    // Reusing getFileInfo is cleaner but we need to ensure the path is correct.
                    // dirPath might be absolute or relative. 

                    // Actually, let's just use the file.path returned from the directory listing if available?
                    // response.data items have a 'path' property which is the relative path in the repo.
                    const filePath = file.path;

                    const { content, sha } = await this.getFileInfo(filePath);
                    if (content === null) return null;

                    return {
                        name: file.name,
                        content,
                        sha: sha || file.sha
                    };
                } catch (e) {
                    logger.warn(`[GIT-SERVICE] Failed to fetch content for ${file.name}`, e);
                    return null;
                }
            }));

            return results.filter((item): item is { name: string; content: string; sha: string } => item !== null);
        } catch (error: unknown) {
            const err = error as { status?: number };
            if (err.status === 404) return [];
            throw error;
        }
    }

    async getFileInfo(filePath: string): Promise<{ content: string | null; sha: string | null }> {
        try {
            const relPath = this.getRelativePath(filePath);
            const client = this.octokit;
            const response = await client.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relPath,
                ref: BRANCH,
            });

            if (Array.isArray(response.data)) return { content: null, sha: null };

            let content: string | null = null;
            if ('content' in response.data && response.data.content) {
                content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            }

            return {
                content,
                sha: response.data.sha || null
            };
        } catch (error: unknown) {
            const err = error as { status?: number };
            if (err.status === 404) return { content: null, sha: null };
            throw error;
        }
    }

    /**
     * Stage a file write (in-memory)
     */
    async writeFileAtomic(absolutePath: string, content: string | Buffer, staging: GitStaging): Promise<void> {
        const relPath = this.getRelativePath(absolutePath);
        staging.pendingWrites.set(relPath, content);
        staging.pendingDeletes.delete(relPath);
    }

    /**
     * Stage a file delete (in-memory)
     */
    async deleteFile(absolutePath: string, staging: GitStaging): Promise<boolean> {
        const relPath = this.getRelativePath(absolutePath);
        staging.pendingDeletes.add(relPath);
        staging.pendingWrites.delete(relPath);
        return true;
    }

    /**
     * Commit a single file (write or update)
     * Now routes through the robust Tree API instead of createOrUpdateFileContents
     */
    async commitFile(relativePath: string, message: string, staging: GitStaging, retryCount = 0): Promise<GitCommitResult> {
        const content = staging.pendingWrites.get(relativePath);
        if (content === undefined) {
            throw new Error(`No pending content for ${relativePath} to commit.`);
        }

        try {
            // Route through atomic Tree API to avoid finding existing SHAs.
            // This prevents cache problems when updating files rapidly on Vercel.
            return await this.commitFiles([relativePath], message, staging, retryCount);
        } catch (error: unknown) {
            throw this.translateError(error);
        }
    }

    /**
     * Convenience method to save and commit a file in one go
     */
    async saveFile(filePath: string, content: string | Buffer, message: string): Promise<GitCommitResult> {
        const relPath = this.getRelativePath(filePath);
        const staging = createGitStaging();
        await this.writeFileAtomic(filePath, content, staging);
        return await this.commitFile(relPath, message, staging);
    }

    /**
     * Commit a single deletion
     * Now routes through the robust Tree API to avoid fine-grained SHA mismatch and caching issues
     */
    async commitDeletion(relativePath: string, message: string, staging: GitStaging): Promise<GitCommitResult> {
        if (!staging.pendingDeletes.has(relativePath)) {
            throw new GitOperationError(
                `File not staged for deletion: ${relativePath}`,
                GitErrorType.INVALID_STATE,
                'File deletion not staged'
            );
        }

        try {
            // Use the atomic Tree API instead of repos.deleteFile.
            // This is infinitely more robust because we don't need to fetch the file's exact SHA first,
            // bypassing aggressive Next.js fetch caching that causes 409 Conflicts.
            return await this.commitFiles([relativePath], message, staging);
        } catch (error: unknown) {
            throw this.translateError(error);
        }
    }

    /**
     * Commit multiple changes atomically using Git Data API (Tree)
     */
    async commitFiles(filesPaths: string[], message: string, staging: GitStaging, retryCount = 0): Promise<GitCommitResult> {
        try {
            const client = this.octokit;
            const ref = `heads/${BRANCH}`;
            const { data: refData } = await client.rest.git.getRef({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                ref,
            });
            const latestCommitSha = refData.object.sha;

            const { data: commitData } = await client.rest.git.getCommit({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                commit_sha: latestCommitSha,
            });
            const baseTreeSha = commitData.tree.sha;

            const treeItems: { path: string; mode: "100644" | "100755" | "040000" | "160000" | "120000"; type: "blob" | "tree" | "commit"; content?: string; sha?: string | null }[] = [];
            for (const p of filesPaths) {
                const relP = p;
                if (staging.pendingWrites.has(relP)) {
                    const content = staging.pendingWrites.get(relP)!;
                    treeItems.push({
                        path: relP,
                        mode: '100644',
                        type: 'blob',
                        content: Buffer.isBuffer(content) ? content.toString('utf-8') : content
                    });
                } else if (staging.pendingDeletes.has(relP)) {
                    treeItems.push({
                        path: relP,
                        mode: '100644',
                        type: 'blob',
                        sha: null
                    });
                }
            }

            if (treeItems.length === 0) {
                return { success: true, message: 'No changes to commit' };
            }

            const { data: treeData } = await client.rest.git.createTree({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                base_tree: baseTreeSha,
                tree: treeItems,
            });

            const { data: newCommitData } = await client.rest.git.createCommit({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                message,
                tree: treeData.sha,
                parents: [latestCommitSha],
                author: {
                    name: process.env.GIT_AUTHOR_NAME || 'Editor',
                    email: process.env.GIT_AUTHOR_EMAIL || 'editor@thehint.news'
                }
            });

            await client.rest.git.updateRef({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                ref,
                sha: newCommitData.sha,
            });

            for (const p of filesPaths) {
                staging.pendingWrites.delete(p);
                staging.pendingDeletes.delete(p);
            }

            return {
                success: true,
                commitHash: newCommitData.sha,
                message
            };
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };

            // PART 1: ATOMIC DELETE - Handle Git 409 Conflicts with explicit SHA refetch
            if ((err.status === 409 || err.status === 422) && retryCount < 2) {
                logger.warn(`[GIT-SERVICE] Git conflict detected (status: ${err.status}), refetching latest SHA and retrying... (attempt ${retryCount + 1}/2)`);

                // Add small delay to allow concurrent operations to settle
                await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));

                // Retry with fresh SHA fetch (recursive call will fetch new SHA)
                return this.commitFiles(filesPaths, message, staging, retryCount + 1);
            }

            // If we've exhausted retries, throw a clear error
            if ((err.status === 409 || err.status === 422) && retryCount >= 2) {
                logger.error(`[GIT-SERVICE] Git conflict persisted after retries. Concurrent modification detected.`);
                throw new GitOperationError(
                    `Git conflict: ${err.message || 'Concurrent modification detected'}`,
                    GitErrorType.CONFLICT,
                    'Another user is modifying content. Please refresh and try again.',
                    error as Error
                );
            }

            throw this.translateError(error);
        }
    }

    async push(): Promise<void> {
        // No-op for API
    }

    async pull(): Promise<void> {
        // No-op
    }

    translateError(error: unknown): GitOperationError {
        const err = error as { status?: number; message?: string };
        const msg = err.message || String(error);
        const status = err.status;

        if (status === 409 || msg.includes('Conflict')) {
            return new GitOperationError(msg, GitErrorType.CONFLICT, 'Concurrent modification detected. Please refresh and try again.', error as Error);
        }
        if (status === 404 || msg.includes('Not Found')) {
            return new GitOperationError(msg, GitErrorType.NOT_FOUND, 'File not found.', error as Error);
        }
        if (status === 401 || msg.includes('Unauthorized')) {
            return new GitOperationError(msg, GitErrorType.PERMISSION, 'Authentication issue. CMS session may have expired.', error as Error);
        }

        return new GitOperationError(msg, GitErrorType.UNKNOWN, "We couldn't complete publishing. Please try again.", error as Error);
    }

}

export const gitService = new GitService();
