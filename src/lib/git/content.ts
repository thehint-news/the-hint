/**
 * Content Operations
 * High-level content operations backed by Git.
 * 
 * This module provides the CRUD operations for drafts and published articles,
 * with all operations mapped to Git commits.
 * 
 * RULES:
 * - Git is the single source of truth
 * - All CRUD operations result in Git commits
 * - Drafts and published content are strictly isolated
 * - Publishing is atomic: draft delete + article create in one commit
 * - No silent failures
 */

import { gitService, GitOperationError, GitErrorType, Section, createGitStaging } from './service';
import { logger } from '../feedback/console-guard';
import path from 'path';
import yaml from 'js-yaml';
import { ContentBlock } from '../content/media-types';

/** Draft data structure */
export interface DraftData {
    draftId: string;
    headline: string;
    subheadline: string;
    section: string;
    contentType: string;
    bodyBlocks?: ContentBlock[];
    body?: string;
    tags: string[];
    sources: string[];
    placement: string;
    thumbnail?: string;
    slug?: string;
    savedAt: string;
    createdAt: string;
    /** Whether this draft is marked as lead story */
    isLead?: boolean;
    /** Lead story carousel media - only valid if isLead === true */
    leadMedia?: {
        images: {
            url: string;
            alt: string;
            width?: number;
            height?: number;
        }[];
    };
}

/** Published article metadata (extracted from frontmatter) */
/** English translation data */
export interface ArticleTranslation {
    title: string;
    subtitle: string;
    body: string;
    excerpt: string;
    translatedAt: string;
}

/** Published article metadata (extracted from frontmatter) */
export interface PublishedArticleData {
    slug: string;
    section: string;
    title: string;
    subtitle: string;
    contentType: string;
    status: string;
    publishedAt: string;
    updatedAt: string | null;
    placement: string;
    tags: string[];
    sources: string[];
    image?: string;
    bodyBlocks?: ContentBlock[];
    body?: string;
    translations?: {
        en?: ArticleTranslation;
    };
    /** Whether this article is the designated lead story */
    isLead?: boolean;
    /** Lead story carousel media - only present if isLead === true */
    leadMedia?: {
        images: {
            url: string;
            alt: string;
            width?: number;
            height?: number;
        }[];
    };
}

/** Article list item for UI display */
export interface ArticleListItem {
    id: string;
    type: 'draft' | 'published';
    headline: string;
    subheadline: string;
    section: string;
    contentType: string;
    savedAt?: string;
    publishedAt?: string;
    slug?: string;
}

/** Result of a content operation */
export interface ContentOperationResult<T = void> {
    success: boolean;
    data?: T;
    userMessage: string;
    errorType?: GitErrorType;
    error?: GitOperationError;
}

/** Valid sections for content */
const VALID_SECTIONS = ['politics', 'world-affairs', 'crime', 'court', 'opinion', 'local'] as const;

/**
 * Content Git Operations
 * Maps CRUD operations to Git commits
 */
class ContentGit {
    /**
     * CREATE: Save a new draft
     */
    async createDraft(draft: Omit<DraftData, 'draftId' | 'savedAt' | 'createdAt'>, existingDraftId?: string): Promise<ContentOperationResult<{ draftId: string; savedAt: string }>> {
        try {
            const now = new Date().toISOString();
            const draftId = existingDraftId || `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // If updating existing draft, try to preserve createdAt
            let createdAt = now;
            if (existingDraftId) {
                const existingDraftPath = gitService.getDraftPath(existingDraftId);
                const existingContent = await gitService.readFile(existingDraftPath);
                if (existingContent) {
                    try {
                        const existingDraft = JSON.parse(existingContent) as DraftData;
                        createdAt = existingDraft.createdAt || now;
                    } catch {
                        // Ignore parse errors, use current time
                    }
                }
            }

            const draftData: DraftData = {
                ...draft,
                draftId,
                savedAt: now,
                createdAt,
            };

            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            // Create staging context for this operation
            const staging = createGitStaging();

            // Write file atomically (stage)
            await gitService.writeFileAtomic(absolutePath, JSON.stringify(draftData, null, 2), staging);

            // Determine commit message
            const isUpdate = existingDraftId && await gitService.fileExists(absolutePath, staging);
            const commitMessage = isUpdate
                ? `Draft updated: ${draft.headline || 'Untitled'}`
                : `Draft created: ${draft.headline || 'Untitled'}`;

            // Commit the change
            await gitService.commitFile(relativePath, commitMessage, staging);

            // Push to remote (non-blocking, will retry)
            this.pushAsync();

            return {
                success: true,
                data: { draftId, savedAt: now },
                userMessage: 'Draft saved successfully.',
            };
        } catch (error) {
            logger.error('Failed to create/update draft', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * READ: Load a draft by ID
     */
    async loadDraft(draftId: string): Promise<ContentOperationResult<DraftData>> {
        try {
            const absolutePath = gitService.getDraftPath(draftId);
            const content = await gitService.readFile(absolutePath);

            if (!content) {
                return {
                    success: false,
                    userMessage: 'Draft not found.',
                    error: new GitOperationError(
                        `Draft not found: ${draftId}`,
                        GitErrorType.NOT_FOUND,
                        'This draft may have been deleted.'
                    ),
                };
            }

            const draftData = JSON.parse(content) as DraftData;

            return {
                success: true,
                data: draftData,
                userMessage: 'Draft loaded.',
            };
        } catch (error) {
            logger.error('Failed to load draft', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * READ: Get all drafts
     * Uses batch file+content fetch to avoid N+1 API calls
     */
    async listDrafts(): Promise<ContentOperationResult<DraftData[]>> {
        try {
            const draftsPath = path.join(process.cwd(), 'src', 'content', 'drafts');
            // Single API call: get all filenames + content together
            const filesWithContent = await gitService.listFilesWithContent(draftsPath, '.json');

            const drafts: DraftData[] = [];

            for (const file of filesWithContent) {
                if (file.name === '.gitkeep') continue;

                try {
                    const draft = JSON.parse(file.content) as DraftData;
                    drafts.push(draft);
                } catch {
                    logger.warn(`Skipping invalid draft file: ${file.name}`);
                }
            }

            // Sort by savedAt descending
            drafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

            return {
                success: true,
                data: drafts,
                userMessage: `Found ${drafts.length} draft(s).`,
            };
        } catch (error) {
            logger.error('Failed to list drafts', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * READ: Get all published articles
     * Fetches ALL sections in parallel, with batch file+content fetch per section
     */
    async listPublishedArticles(): Promise<ContentOperationResult<PublishedArticleData[]>> {
        try {
            // Fetch all sections in PARALLEL (was sequential before)
            const sectionResults = await Promise.all(
                VALID_SECTIONS.map(async (section) => {
                    const sectionPath = path.join(process.cwd(), 'src', 'content', section);
                    // Single API call per section: get all filenames + content
                    const filesWithContent = await gitService.listFilesWithContent(sectionPath, '.md');

                    const sectionArticles: PublishedArticleData[] = [];
                    for (const file of filesWithContent) {
                        try {
                            const article = this.parseMarkdownFrontmatter(
                                file.content,
                                section,
                                file.name.replace('.md', '')
                            );
                            if (article) {
                                sectionArticles.push(article);
                            }
                        } catch {
                            logger.warn(`Skipping invalid article file: ${file.name}`);
                        }
                    }
                    return sectionArticles;
                })
            );

            // Flatten all section results
            const articles = sectionResults.flat();

            // Sort by publishedAt descending
            articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

            return {
                success: true,
                data: articles,
                userMessage: `Found ${articles.length} published article(s).`,
            };
        } catch (error) {
            logger.error('Failed to list published articles', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * UPDATE: Update an existing draft
     */
    async updateDraft(draftId: string, updates: Partial<DraftData>): Promise<ContentOperationResult<{ savedAt: string }>> {
        try {
            // Load existing draft
            const loadResult = await this.loadDraft(draftId);
            if (!loadResult.success || !loadResult.data) {
                return {
                    success: false,
                    userMessage: 'Draft not found. It may have been deleted.',
                };
            }

            // Merge updates
            const existingData = loadResult.data as DraftData;
            const updatedDraft: DraftData = {
                ...existingData,
                ...updates,
                draftId, // Preserve original ID
                savedAt: new Date().toISOString(),
            };
            const headline = updatedDraft.headline || 'Untitled';

            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            const staging = createGitStaging();

            // Write updated draft
            await gitService.writeFileAtomic(absolutePath, JSON.stringify(updatedDraft, null, 2), staging);

            // Commit
            await gitService.commitFile(relativePath, `Update draft: ${headline}`, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                data: { savedAt: updatedDraft.savedAt },
                userMessage: 'Draft updated.',
            };
        } catch (error) {
            logger.error('Failed to update draft', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * DELETE: Remove a draft (DETERMINISTIC & ATOMIC)
     *
     * PART 2: SEPARATE DRAFT DELETE LOGIC
     * - No ISR revalidation required
     - Idempotent: safe to call multiple times
     * - Returns structured result with operation details
     *
     * PERFORMANCE: Maximum 3 API calls (getFileInfo + commit operations)
     */
    async deleteDraft(draftId: string): Promise<ContentOperationResult<{
        type: 'draft';
        alreadyDeleted: boolean;
        commitHash?: string;
    }>> {
        const operationId = `draft-del-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // PART 7: LOGGING - Delete request received
        logger.info(`[DELETE-DRAFT] [${operationId}] START | draftId: ${draftId}`);

        try {
            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            // STEP 1: Fetch latest SHA (idempotency check)
            logger.info(`[DELETE-DRAFT] [${operationId}] Fetching file info...`);
            const { sha } = await gitService.getFileInfo(relativePath);

            // PART 7: LOGGING - SHA before delete
            logger.info(`[DELETE-DRAFT] [${operationId}] SHA before delete: ${sha || 'NOT_FOUND'}`);

            // STEP 2: Handle already-deleted case (IDEMPOTENT)
            if (!sha) {
                logger.info(`[DELETE-DRAFT] [${operationId}] File already deleted, returning idempotent success`);
                return {
                    success: true,
                    userMessage: 'Draft already removed.',
                    data: { type: 'draft', alreadyDeleted: true }
                };
            }

            // STEP 3: Stage the delete
            const staging = createGitStaging();
            await gitService.deleteFile(absolutePath, staging);
            logger.info(`[DELETE-DRAFT] [${operationId}] Staged for deletion: ${relativePath}`);

            // STEP 4: Commit deletion (ATOMIC)
            logger.info(`[DELETE-DRAFT] [${operationId}] Attempting Git commit...`);
            const result = await gitService.commitDeletion(
                relativePath,
                `Remove draft: ${draftId}`,
                staging
            );

            // PART 7: LOGGING - Git response
            logger.info(`[DELETE-DRAFT] [${operationId}] Git commit result: success=${result.success}, hash=${result.commitHash || 'N/A'}`);

            if (!result.success) {
                logger.error(`[DELETE-DRAFT] [${operationId}] Git commit failed`);
                return {
                    success: false,
                    userMessage: 'Failed to delete draft. Git commit was not confirmed.',
                    error: new GitOperationError(
                        'Commit returned unsuccessful',
                        GitErrorType.UNKNOWN,
                        'Deletion could not be confirmed. Please try again.'
                    )
                };
            }

            // PART 7: LOGGING - Final success
            logger.info(`[DELETE-DRAFT] [${operationId}] SUCCESS | Commit: ${result.commitHash}`);

            return {
                success: true,
                userMessage: 'Draft deleted successfully.',
                data: {
                    type: 'draft',
                    alreadyDeleted: false,
                    commitHash: result.commitHash
                }
            };

        } catch (error) {
            logger.error(`[DELETE-DRAFT] [${operationId}] ERROR:`, error);
            const gitError = gitService.translateError(error);

            // PART 5: IDEMPOTENCY - Treat already deleted as success
            if (gitError.type === GitErrorType.NOT_FOUND) {
                logger.info(`[DELETE-DRAFT] [${operationId}] Caught NOT_FOUND, treating as idempotent success`);
                return {
                    success: true,
                    userMessage: 'Draft already removed.',
                    data: { type: 'draft', alreadyDeleted: true }
                };
            }

            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * DELETE: Remove a published article (DETERMINISTIC & ATOMIC)
     *
     * PART 2: SEPARATE PUBLISHED DELETE LOGIC
     * - Returns structured result with ISR paths that need revalidation
     * - Idempotent: safe to call multiple times
     * - Returns article metadata for ISR coordination
     *
     * PERFORMANCE: Maximum 3 API calls (getFileInfo + commit operations)
     */
    async deletePublishedArticle(section: Section, slug: string): Promise<ContentOperationResult<{
        type: 'published';
        section: string;
        slug: string;
        alreadyDeleted: boolean;
        commitHash?: string;
        title?: string;
        /** Paths that MUST be revalidated after successful delete */
        revalidationPaths: string[];
    }>> {
        const operationId = `pub-del-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // PART 7: LOGGING - Delete request received
        logger.info(`[DELETE-PUBLISHED] [${operationId}] START | section: ${section}, slug: ${slug}`);

        try {
            const absolutePath = gitService.getPublishedPath(section, slug);
            const relativePath = gitService.getPublishedRelativePath(section, slug);

            // STEP 1: Fetch latest SHA and content (single API call for idempotency + metadata)
            logger.info(`[DELETE-PUBLISHED] [${operationId}] Fetching file info...`);
            const { content, sha } = await gitService.getFileInfo(relativePath);

            // PART 7: LOGGING - SHA before delete
            logger.info(`[DELETE-PUBLISHED] [${operationId}] SHA before delete: ${sha || 'NOT_FOUND'}`);

            // STEP 2: Handle already-deleted case (IDEMPOTENT)
            if (!sha) {
                logger.info(`[DELETE-PUBLISHED] [${operationId}] File already deleted, returning idempotent success`);
                return {
                    success: true,
                    userMessage: 'Article already removed.',
                    data: {
                        type: 'published',
                        section,
                        slug,
                        alreadyDeleted: true,
                        revalidationPaths: ['/', `/${section}`, `/${section}/${slug}`]
                    }
                };
            }

            // STEP 3: Extract metadata for commit message and response
            let headline = slug;
            let articleData: PublishedArticleData | null = null;

            if (content) {
                articleData = this.parseMarkdownFrontmatter(content, section, slug);
                if (articleData && articleData.title) {
                    headline = articleData.title;
                }
            }

            logger.info(`[DELETE-PUBLISHED] [${operationId}] Article title: ${headline}`);

            // STEP 4: Stage + commit deletion (ATOMIC)
            const staging = createGitStaging();
            await gitService.deleteFile(absolutePath, staging);
            logger.info(`[DELETE-PUBLISHED] [${operationId}] Staged for deletion: ${relativePath}`);

            logger.info(`[DELETE-PUBLISHED] [${operationId}] Attempting Git commit...`);
            const result = await gitService.commitDeletion(
                relativePath,
                `Remove article: ${headline}`,
                staging
            );

            // PART 7: LOGGING - Git response
            logger.info(`[DELETE-PUBLISHED] [${operationId}] Git commit result: success=${result.success}, hash=${result.commitHash || 'N/A'}`);

            if (!result.success) {
                logger.error(`[DELETE-PUBLISHED] [${operationId}] Git commit failed`);
                return {
                    success: false,
                    userMessage: 'Failed to delete article. Git commit was not confirmed.',
                    error: new GitOperationError(
                        'Commit returned unsuccessful',
                        GitErrorType.UNKNOWN,
                        'Deletion could not be confirmed. Please try again.'
                    )
                };
            }

            // PART 7: LOGGING - Final success
            logger.info(`[DELETE-PUBLISHED] [${operationId}] SUCCESS | Commit: ${result.commitHash}`);

            // PART 3: Return revalidation paths for ISR coordination
            return {
                success: true,
                userMessage: 'Article removed successfully.',
                data: {
                    type: 'published',
                    section,
                    slug,
                    alreadyDeleted: false,
                    commitHash: result.commitHash,
                    title: headline,
                    revalidationPaths: ['/', `/${section}`, `/${section}/${slug}`]
                }
            };

        } catch (error) {
            logger.error(`[DELETE-PUBLISHED] [${operationId}] ERROR:`, error);
            const gitError = gitService.translateError(error);

            // PART 5: IDEMPOTENCY - Treat already deleted as success
            if (gitError.type === GitErrorType.NOT_FOUND) {
                logger.info(`[DELETE-PUBLISHED] [${operationId}] Caught NOT_FOUND, treating as idempotent success`);
                return {
                    success: true,
                    userMessage: 'Article already removed.',
                    data: {
                        type: 'published',
                        section,
                        slug,
                        alreadyDeleted: true,
                        revalidationPaths: ['/', `/${section}`, `/${section}/${slug}`]
                    }
                };
            }

            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * PUBLISH: Atomic publish operation
     */
    async publish(articleData: {
        headline: string;
        subheadline: string;
        section: Section;
        contentType: string;
        bodyBlocks?: ContentBlock[];
        body?: string;
        tags: string[];
        sources: string[];
        placement: string;
        slug: string;
        thumbnail?: string;
        draftId?: string;
        isLead?: boolean;
        leadMedia?: {
            images: {
                url: string;
                alt: string;
                width?: number;
                height?: number;
            }[];
        };
    }): Promise<ContentOperationResult<{ slug: string; section: string; url: string; publishedAt: string; mode: 'create' | 'update' }>> {
        try {
            const { section, slug, draftId, headline } = articleData;

            // 1. Check If File Exists (Detect Mode)
            const articleRelativePath = gitService.getPublishedRelativePath(section, slug);

            let existingFile: string | null = null;
            let existingSha: string | null = null;

            try {
                const fileInfo = await gitService.getFileInfo(articleRelativePath);
                existingFile = fileInfo.content;
                existingSha = fileInfo.sha;
            } catch {
                // File doesn't exist - this is OK for new articles
            }

            const mode = existingSha ? 'update' : 'create';
            let publishedAt = new Date().toISOString();
            let originalSlug: string | undefined;

            // 2. Draft Safety Check: Ensure draft matches intended slug
            if (draftId) {
                const draftPath = gitService.getDraftPath(draftId);
                const draftContent = await gitService.readFile(draftPath);
                if (draftContent) {
                    try {
                        const draftData = JSON.parse(draftContent) as DraftData;
                        originalSlug = draftData.slug;

                        // Safety check: Prevents arbitrary overwrite via manual slug injection
                        if (originalSlug && originalSlug !== slug) {
                            return {
                                success: false,
                                userMessage: "Slug mismatch between draft and publication. Update blocked for safety.",
                                errorType: GitErrorType.VALIDATION_ERROR,
                                data: { slug: '', section: '', url: '', publishedAt: '', mode: 'update' } as { slug: string; section: string; url: string; publishedAt: string; mode: 'create' | 'update' }
                            };
                        }
                    } catch (e) {
                        logger.warn(`Failed to parse draft ${draftId} during safety check`, e);
                    }
                }
            }

            // 3. Preserve Metadata for Update Mode
            if (mode === 'update' && existingFile) {
                const existingArticle = this.parseMarkdownFrontmatter(existingFile, section, slug);
                if (existingArticle) {
                    // SLUG STABILITY: Use original publication date
                    publishedAt = existingArticle.publishedAt;
                }
            }

            // 4. Generate markdown content
            const markdownContent = this.generateMarkdownContent({
                ...articleData,
                image: articleData.thumbnail,
                publishedAt,
                updatedAt: mode === 'update' ? new Date().toISOString() : undefined,
                translations: {
                    en: {
                        status: 'pending',
                        title: headline, // Use original as placeholder
                        subtitle: articleData.subheadline,
                        translatedAt: new Date().toISOString(),
                    } as any
                }
            });

            const articlePath = gitService.getPublishedPath(section, slug);

            // 4. Atomic Staging (Delete draft + Write article)
            const staging = createGitStaging();
            const pathsToCommit: string[] = [articleRelativePath];

            if (draftId) {
                const draftPath = gitService.getDraftPath(draftId);
                const draftRelPath = gitService.getDraftRelativePath(draftId);
                // Check again to be sure
                if (await gitService.fileExists(draftPath)) { // Check without staging context first
                    await gitService.deleteFile(draftPath, staging);
                    pathsToCommit.push(draftRelPath);
                }
            }

            // Write article
            await gitService.writeFileAtomic(articlePath, markdownContent, staging);

            // 5. Commit all
            const commitMessage = (mode === 'create' ? 'Publish article: ' : 'Update article: ') + headline;
            await gitService.commitFiles(pathsToCommit, commitMessage, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                data: {
                    slug,
                    section,
                    url: `/${section}/${slug}`,
                    publishedAt,
                    mode,
                },
                userMessage: mode === 'update' ? 'Article updated successfully.' : 'Article published successfully.',
            };
        } catch (error) {
            logger.error('[GIT-PUBLISH] Failed to publish article', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                section: articleData.section,
                slug: articleData.slug,
            });
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * UPDATE: Update a published article
     */
    async updatePublishedArticle(
        section: Section,
        slug: string,
        updates: Partial<{
            headline: string;
            subheadline: string;
            bodyBlocks: ContentBlock[];
            body: string;
            tags: string[];
            sources: string[];
            placement: string;
            thumbnail: string;
        }>
    ): Promise<ContentOperationResult<{ updatedAt: string }>> {
        try {
            const absolutePath = gitService.getPublishedPath(section, slug);
            const relativePath = gitService.getPublishedRelativePath(section, slug);

            if (!await gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Article not found.',
                };
            }

            // Read existing content
            const existingContent = await gitService.readFile(absolutePath);
            if (!existingContent) {
                return {
                    success: false,
                    userMessage: 'Could not read article.',
                };
            }

            const existingArticle = this.parseMarkdownFrontmatter(existingContent, section, slug);
            if (!existingArticle) {
                return {
                    success: false,
                    userMessage: 'Could not parse article.',
                };
            }

            const updatedAt = new Date().toISOString();

            // Merge updates
            const updatedArticle = {
                headline: updates.headline || existingArticle.title,
                subheadline: updates.subheadline || existingArticle.subtitle,
                section,
                contentType: existingArticle.contentType,
                bodyBlocks: updates.bodyBlocks || existingArticle.bodyBlocks,
                body: updates.body !== undefined ? updates.body : existingArticle.body, // updating body to empty string is valid
                tags: updates.tags || existingArticle.tags,
                sources: updates.sources || existingArticle.sources,
                placement: updates.placement || existingArticle.placement,
                image: updates.thumbnail !== undefined ? updates.thumbnail : existingArticle.image,
                slug,
                publishedAt: existingArticle.publishedAt,
                updatedAt,
            };

            // Generate updated markdown
            const markdownContent = this.generateMarkdownContent(updatedArticle);

            // Write atomically (stage)
            const staging = createGitStaging();
            await gitService.writeFileAtomic(absolutePath, markdownContent, staging);

            // Commit
            await gitService.commitFile(relativePath, `Update: ${updatedArticle.headline}`, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                data: { updatedAt },
                userMessage: 'Article updated.',
            };
        } catch (error) {
            logger.error('Failed to update published article', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * Check if a slug already exists
     */
    async slugExists(section: Section, slug: string): Promise<boolean> {
        const absolutePath = gitService.getPublishedPath(section, slug);
        return await gitService.fileExists(absolutePath);
    }

    /**
     * Check if a draft exists
     */
    async draftExists(draftId: string): Promise<boolean> {
        const absolutePath = gitService.getDraftPath(draftId);
        return await gitService.fileExists(absolutePath);
    }

    /**
     * Generate markdown content with frontmatter
     * Uses js-yaml for safe dumping
     */
    private generateMarkdownContent(data: {
        headline: string;
        subheadline: string;
        contentType: string;
        bodyBlocks?: ContentBlock[]; // New canonical
        body?: string;              // Legacy
        tags: string[];
        sources: string[];
        placement: string;
        image?: string;
        publishedAt: string;
        updatedAt?: string;
        translations?: any;
        isLead?: boolean;
        leadMedia?: {
            images: {
                url: string;
                alt: string;
                width?: number;
                height?: number;
            }[];
        };
    }): string {
        const frontmatter: Record<string, unknown> = {
            title: data.headline,
            subtitle: data.subheadline,
            contentType: data.contentType,
            image: data.image,
            status: 'published',
            publishedAt: data.publishedAt,
            updatedAt: data.updatedAt || null,
            placement: data.placement,
            tags: data.tags,
            sources: data.sources,
            translations: data.translations || null,
        };

        // If bodyBlocks exist, add them to frontmatter (CANONICAL)
        if (data.bodyBlocks && data.bodyBlocks.length > 0) {
            frontmatter.bodyBlocks = data.bodyBlocks;
        }

        // Add lead story fields if this is a lead article
        if (data.isLead === true) {
            frontmatter.isLead = true;

            // Only add leadMedia if it has valid images
            if (data.leadMedia && data.leadMedia.images && data.leadMedia.images.length > 0) {
                // Validate and clean leadMedia
                const validImages = data.leadMedia.images
                    .filter(img => img.url && img.alt)
                    .slice(0, 3); // Enforce max 3 images

                if (validImages.length > 0) {
                    frontmatter.leadMedia = {
                        images: validImages.map(img => ({
                            url: img.url,
                            alt: img.alt,
                            ...(img.width && { width: img.width }),
                            ...(img.height && { height: img.height }),
                        })),
                    };
                }
            }
        }

        const yamlBlock = yaml.dump(frontmatter, {
            lineWidth: -1, // Prevent line wrapping
            noRefs: true   // Prevent aliases
        }).trim();

        // If bodyBlocks exist, we DO NOT write body content (it's legacy)
        // Unless it's explicitly requested or we are in a mixed state (unlikely)
        // The rule is: bodyBlocks = canonical.

        // HOWEVER, to ensure legacy readers don't break immediately if they ignore frontmatter blocks,
        // we could potentially render a fallback... 

        let fileContent = `---\n${yamlBlock}\n---`;

        // Always append body if it exists, for legacy compatibility
        // The parser will prefer bodyBlocks from frontmatter if present
        if (data.body) {
            fileContent += `\n\n${data.body}\n`;
        } else {
            fileContent += `\n`; // Clean ending
        }

        return fileContent;
    }

    /**
     * Parse markdown frontmatter to extract article data
     * Now uses js-yaml for robust parsing including bodyBlocks
     */
    private parseMarkdownFrontmatter(content: string, section: string, slug: string): PublishedArticleData | null {
        try {
            // Robust regex from parser.ts
            const FRONTMATTER_REGEX = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
            const frontmatterMatch = content.match(FRONTMATTER_REGEX);

            let frontmatterRaw = '';
            let body = '';

            if (frontmatterMatch) {
                frontmatterRaw = frontmatterMatch[1];
                body = frontmatterMatch[2].trim();
            } else if (content.startsWith('---\n')) {
                // Try to match frontmatter only
                const end = content.indexOf('\n---', 4);
                if (end !== -1) {
                    frontmatterRaw = content.substring(4, end);
                    body = content.substring(end + 4).trim();
                }
            }

            if (!frontmatterRaw) return null;

            const data = yaml.load(frontmatterRaw) as Record<string, unknown>;

            // Runtime validation of required fields
            if (!data.title) {
                logger.warn(`Missing required frontmatter 'title' in ${slug}`);
                return null;
            }

            // Default contentType for legacy content
            if (!data.contentType) {
                logger.warn(`Missing 'contentType' in ${slug}, defaulting to 'news'`);
            }

            // Parse translations if present
            let translations: PublishedArticleData['translations'] = undefined;
            if (data.translations && typeof data.translations === 'object') {
                const transData = data.translations as Record<string, unknown>;
                const enTranslation = transData.en as Record<string, unknown> | undefined;
                if (enTranslation && typeof enTranslation === 'object') {
                    translations = {
                        en: {
                            title: String(enTranslation.title || data.title),
                            subtitle: String(enTranslation.subtitle || data.subtitle || ''),
                            body: String(enTranslation.body || body),
                            excerpt: String(enTranslation.excerpt || enTranslation.subtitle || data.subtitle || ''),
                            translatedAt: String(enTranslation.translatedAt || new Date().toISOString()),
                        },
                    };
                }
            }

            // Parse lead media if present
            let leadMedia: PublishedArticleData['leadMedia'] = undefined;
            if (data.leadMedia && typeof data.leadMedia === 'object') {
                const lm = data.leadMedia as Record<string, unknown>;
                if (Array.isArray(lm.images)) {
                    leadMedia = {
                        images: lm.images.map((img: unknown) => {
                            if (typeof img !== 'object' || img === null) {
                                return { url: '', alt: '' };
                            }
                            const image = img as Record<string, unknown>;
                            return {
                                url: String(image.url || ''),
                                alt: String(image.alt || ''),
                                width: typeof image.width === 'number' ? image.width : undefined,
                                height: typeof image.height === 'number' ? image.height : undefined,
                            };
                        }).filter(img => img.url && img.alt),
                    };
                }
            }

            return {
                slug,
                section,
                title: String(data.title),
                subtitle: String(data.subtitle || ''),
                contentType: String(data.contentType || 'news'),
                status: String(data.status || 'published'),
                publishedAt: String(data.publishedAt || new Date().toISOString()),
                updatedAt: (data.updatedAt === null || data.updatedAt === undefined || data.updatedAt === 'null')
                    ? null
                    : String(data.updatedAt),
                placement: String(data.placement || 'standard'),
                tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
                sources: Array.isArray(data.sources) ? data.sources.map(String) : [],
                image: data.image ? String(data.image) : undefined,
                bodyBlocks: Array.isArray(data.bodyBlocks) ? data.bodyBlocks as ContentBlock[] : undefined,
                body,
                translations,
                isLead: data.isLead === true,
                leadMedia: leadMedia && leadMedia.images.length > 0 ? leadMedia : undefined,
            };
        } catch (error) {
            logger.error('Failed to parse frontmatter', error);
            return null;
        }
    }

    /**
     * UPDATE TRANSLATION: Update article with English translation
     * Called after automatic translation generation
     */
    async updateTranslation(
        section: Section,
        slug: string,
        translation: {
            title: string;
            subheadline?: string;
            body: string;
            excerpt?: string;
            translatedAt: string;
        }
    ): Promise<ContentOperationResult> {
        try {
            const articleRelativePath = gitService.getPublishedRelativePath(section, slug);
            const { content: existingFile, sha: existingSha } = await gitService.getFileInfo(articleRelativePath);

            if (!existingFile || !existingSha) {
                return {
                    success: false,
                    userMessage: 'Article not found',
                    errorType: GitErrorType.NOT_FOUND,
                };
            }

            // Parse existing article
            const existingArticle = this.parseMarkdownFrontmatter(existingFile, section, slug);
            if (!existingArticle) {
                return {
                    success: false,
                    userMessage: 'Failed to parse existing article',
                    errorType: GitErrorType.VALIDATION_ERROR,
                };
            }

            // Reconstruct frontmatter by parsing the RAW yaml to preserve ALL arbitrary metadata fields
            const yaml = await import('js-yaml');
            let rawFrontmatter: Record<string, unknown> = {};

            const match = existingFile.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/);
            if (match) {
                rawFrontmatter = (yaml.load(match[1]) as Record<string, unknown>) || {};
            } else if (existingFile.startsWith('---\n')) {
                const end = existingFile.indexOf('\n---', 4);
                if (end !== -1) {
                    rawFrontmatter = (yaml.load(existingFile.substring(4, end)) as Record<string, unknown>) || {};
                }
            }

            // Replace translations while keeping original frontmatter intact
            const updatedFrontmatter = {
                ...rawFrontmatter,
                translations: {
                    ...((rawFrontmatter.translations as Record<string, unknown>) || {}),
                    en: {
                        status: 'ready',
                        title: translation.title,
                        subtitle: translation.subheadline || existingArticle.subtitle,
                        body: translation.body,
                        excerpt: translation.excerpt || translation.subheadline || existingArticle.subtitle,
                        translatedAt: translation.translatedAt,
                    },
                },
            };

            // Generate updated markdown
            const yamlBlock = yaml.dump(updatedFrontmatter, {
                lineWidth: -1,
                noRefs: true,
            }).trim();

            let fileContent = `---\n${yamlBlock}\n---`;

            // Preserve original body
            const bodyMatch = existingFile.match(/---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]+([\s\S]*)$/);
            const originalBody = bodyMatch ? bodyMatch[1].trim() : '';

            if (originalBody) {
                fileContent += `\n\n${originalBody}\n`;
            } else {
                fileContent += `\n`;
            }

            const articlePath = gitService.getPublishedPath(section, slug);
            const staging = createGitStaging();

            // Write updated article
            await gitService.writeFileAtomic(articlePath, fileContent, staging);

            // Commit
            const commitMessage = `Update translation: ${existingArticle.title}`;
            await gitService.commitFiles([articleRelativePath], commitMessage, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                userMessage: 'Translation updated successfully',
            };
        } catch (error) {
            logger.error('Failed to update translation', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }

    }

    /**
     * MARK TRANSLATION FAILED
     * Sets internal state so UI knows translation failed to generate
     */
    async markTranslationFailed(section: Section, slug: string): Promise<ContentOperationResult> {
        try {
            const articleRelativePath = gitService.getPublishedRelativePath(section, slug);
            const { content: existingFile, sha: existingSha } = await gitService.getFileInfo(articleRelativePath);

            if (!existingFile || !existingSha) return { success: true, userMessage: 'Article not found' };

            const yaml = await import('js-yaml');
            const match = existingFile.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/);
            if (!match) return { success: false, userMessage: 'Invalid article format' };

            const rawFrontmatter = (yaml.load(match[1]) as Record<string, unknown>) || {};
            const originalBody = match[2].trim();

            const updatedFrontmatter = {
                ...rawFrontmatter,
                translations: {
                    ...((rawFrontmatter.translations as Record<string, unknown>) || {}),
                    en: {
                        ...((rawFrontmatter.translations as any)?.en || {}),
                        status: 'failed',
                        translatedAt: new Date().toISOString()
                    }
                }
            };

            const fileContent = `---\n${yaml.dump(updatedFrontmatter, { lineWidth: -1, noRefs: true }).trim()}\n---\n\n${originalBody}\n`;

            const articlePath = gitService.getPublishedPath(section, slug);
            const staging = createGitStaging();
            await gitService.writeFileAtomic(articlePath, fileContent, staging);
            await gitService.commitFiles([articleRelativePath], `Mark translation failed: ${slug}`, staging);
            this.pushAsync();

            return { success: true, userMessage: 'Translation marked as failed' };
        } catch (error) {
            logger.error('Failed to mark translation failed', error);
            return { success: false, userMessage: 'Error updating failure status' };
        }
    }

    /**
     * Push changes to remote asynchronously
     */
    private pushAsync(): void {
        gitService.push().catch(error => {
            logger.error('Background push failed', error);
        });
    }
}

// Export singleton
export const contentGit = new ContentGit();
