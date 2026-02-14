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
    console.warn('[GIT-SERVICE] Warning: GIT_REPO_OWNER or GIT_REPO_NAME missing. Git operations will fail.');
}
const BRANCH = 'main';

/** Valid sections for published content */
const VALID_SECTIONS = ['politics', 'world-affairs', 'crime', 'court', 'opinion'] as const;
export type Section = typeof VALID_SECTIONS[number];

class GitService {
    private octokit: Octokit;

    constructor() {
        const token = process.env.GIT_TOKEN;
        if (!token) {
            throw new Error('[GIT-SERVICE] Missing GIT_TOKEN environment variable.');
        }

        this.octokit = new Octokit({
            auth: token,
        });
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

            const response = await this.octokit.rest.repos.getContent({
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
        } catch (error: any) {
            if (error.status === 404) return null;
            console.error(`Git readFile error for ${filePath}:`, error.message);
            return null;
        }
    }

    async fileExists(filePath: string, staging?: GitStaging): Promise<boolean> {
        return (await this.readFile(filePath, staging)) !== null;
    }

    async listFiles(dirPath: string, extension?: string): Promise<string[]> {
        try {
            const relPath = this.getRelativePath(dirPath);
            const response = await this.octokit.rest.repos.getContent({
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
        } catch (error: any) {
            if (error.status === 404) return [];
            return [];
        }
    }

    async getFileInfo(filePath: string): Promise<{ content: string | null; sha: string | null }> {
        try {
            const relPath = this.getRelativePath(filePath);

            const response = await this.octokit.rest.repos.getContent({
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
        } catch (error: any) {
            if (error.status === 404) return { content: null, sha: null };
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
     */
    async commitFile(relativePath: string, message: string, staging: GitStaging, retryCount = 0): Promise<GitCommitResult> {
        const content = staging.pendingWrites.get(relativePath);
        if (content === undefined) {
            throw new Error(`No pending content for ${relativePath} to commit.`);
        }

        try {
            let sha: string | undefined;
            try {
                const { data } = await this.octokit.rest.repos.getContent({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: relativePath,
                    ref: BRANCH,
                });
                if (!Array.isArray(data) && 'sha' in data) {
                    sha = data.sha;
                }
            } catch (e: any) {
                if (e.status !== 404) throw e;
            }

            const contentBase64 = Buffer.isBuffer(content)
                ? content.toString('base64')
                : Buffer.from(content, 'utf-8').toString('base64');

            const res = await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relativePath,
                message,
                content: contentBase64,
                branch: BRANCH,
                sha,
                committer: {
                    name: process.env.GIT_AUTHOR_NAME || 'Editor',
                    email: process.env.GIT_AUTHOR_EMAIL || 'editor@thehint.news'
                },
                author: {
                    name: process.env.GIT_AUTHOR_NAME || 'Editor',
                    email: process.env.GIT_AUTHOR_EMAIL || 'editor@thehint.news'
                }
            });

            staging.pendingWrites.delete(relativePath);

            return {
                success: true,
                commitHash: res.data.commit.sha,
                message
            };
        } catch (error: any) {
            if (error.status === 409 && retryCount < 1) {
                return this.commitFile(relativePath, message, staging, retryCount + 1);
            }
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
            const { data } = await this.octokit.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relativePath,
                ref: BRANCH,
            });

            if (Array.isArray(data) || !('sha' in data)) {
                throw new Error('Path is a directory or invalid');
            }

            const res = await this.octokit.rest.repos.deleteFile({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: relativePath,
                message,
                sha: data.sha,
                branch: BRANCH,
                committer: {
                    name: process.env.GIT_AUTHOR_NAME || 'Editor',
                    email: process.env.GIT_AUTHOR_EMAIL || 'editor@thehint.news'
                },
                author: {
                    name: process.env.GIT_AUTHOR_NAME || 'Editor',
                    email: process.env.GIT_AUTHOR_EMAIL || 'editor@thehint.news'
                }
            });

            staging.pendingDeletes.delete(relativePath);

            return {
                success: true,
                commitHash: res.data.commit.sha,
                message
            };
        } catch (error: any) {
            throw this.translateError(error);
        }
    }

    /**
     * Commit multiple changes atomically using Git Data API (Tree)
     */
    async commitFiles(filesPaths: string[], message: string, staging: GitStaging, retryCount = 0): Promise<GitCommitResult> {
        try {
            const ref = `heads/${BRANCH}`;
            const { data: refData } = await this.octokit.rest.git.getRef({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                ref,
            });
            const latestCommitSha = refData.object.sha;

            const { data: commitData } = await this.octokit.rest.git.getCommit({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                commit_sha: latestCommitSha,
            });
            const baseTreeSha = commitData.tree.sha;

            const treeItems: any[] = [];
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

            const { data: treeData } = await this.octokit.rest.git.createTree({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                base_tree: baseTreeSha,
                tree: treeItems,
            });

            const { data: newCommitData } = await this.octokit.rest.git.createCommit({
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

            await this.octokit.rest.git.updateRef({
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
        } catch (error: any) {
            if ((error.status === 409 || error.status === 422) && retryCount < 1) {
                return this.commitFiles(filesPaths, message, staging, retryCount + 1);
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

    translateError(error: any): GitOperationError {
        const msg = error.message || String(error);
        const status = error.status;

        if (status === 409 || msg.includes('Conflict')) {
            return new GitOperationError(msg, GitErrorType.CONFLICT, 'Concurrent modification detected. Please refresh and try again.', error);
        }
        if (status === 404 || msg.includes('Not Found')) {
            return new GitOperationError(msg, GitErrorType.NOT_FOUND, 'File not found.', error);
        }
        if (status === 401 || msg.includes('Unauthorized')) {
            return new GitOperationError(msg, GitErrorType.PERMISSION, 'Authentication issue. CMS session may have expired.', error);
        }

        return new GitOperationError(msg, GitErrorType.UNKNOWN, "We couldn't complete publishing. Please try again.", error);
    }
}

export const gitService = new GitService();
