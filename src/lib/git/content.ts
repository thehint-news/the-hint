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
}

/** Published article metadata (extracted from frontmatter) */
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
const VALID_SECTIONS = ['politics', 'world-affairs', 'crime', 'court', 'opinion'] as const;

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
     * DELETE: Remove a draft
     * 
     * OPTIMIZED: Skip redundant fileExists + loadDraft calls.
     * The commit itself is idempotent — if the file doesn't exist in the tree,
     * GitHub's Tree API will simply create a no-op commit.
     * We catch 404 from getContent during commit and treat it as success (already deleted).
     */
    async deleteDraft(draftId: string): Promise<ContentOperationResult> {
        try {
            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            // Stage the delete
            const staging = createGitStaging();
            await gitService.deleteFile(absolutePath, staging);

            // Commit deletion — this is the ONLY set of API calls we need (5 calls: getRef, getCommit, createTree, createCommit, updateRef)
            const result = await gitService.commitDeletion(relativePath, `Remove draft: ${draftId}`, staging);

            if (!result.success) {
                return {
                    success: false,
                    userMessage: 'Failed to delete draft.',
                };
            }

            return {
                success: true,
                userMessage: 'Draft deleted.',
            };
        } catch (error) {
            logger.error('Failed to delete draft', error);
            const gitError = gitService.translateError(error);

            // If the file was already gone (404 during tree creation), treat as success
            if (gitError.type === GitErrorType.NOT_FOUND) {
                return {
                    success: true,
                    userMessage: 'Draft already removed.',
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
     * DELETE: Remove a published article
     * 
     * OPTIMIZED: Single getFileInfo call (1 API call) to check existence + get headline,
     * then direct commit (5 API calls). Total: 6 API calls (was 8-9).
     * If file doesn't exist, returns success (idempotent).
     */
    async deletePublishedArticle(section: Section, slug: string): Promise<ContentOperationResult> {
        try {
            const absolutePath = gitService.getPublishedPath(section, slug);
            const relativePath = gitService.getPublishedRelativePath(section, slug);

            // Single API call: check existence + get content for commit message
            const { content, sha } = await gitService.getFileInfo(relativePath);

            if (!sha) {
                // Already deleted — idempotent success
                return {
                    success: true,
                    userMessage: 'Article already removed.',
                };
            }

            // Extract headline for commit message (from content we already have)
            let headline = slug;
            if (content) {
                const article = this.parseMarkdownFrontmatter(content, section, slug);
                if (article) {
                    headline = article.title;
                }
            }

            // Stage + commit deletion
            const staging = createGitStaging();
            await gitService.deleteFile(absolutePath, staging);
            const result = await gitService.commitDeletion(relativePath, `Remove article: ${headline}`, staging);

            if (!result.success) {
                return {
                    success: false,
                    userMessage: 'Failed to delete article.',
                };
            }

            return {
                success: true,
                userMessage: 'Article removed.',
            };
        } catch (error) {
            logger.error('Failed to delete published article', error);
            const gitError = gitService.translateError(error);

            // If the file was already gone, treat as success
            if (gitError.type === GitErrorType.NOT_FOUND) {
                return {
                    success: true,
                    userMessage: 'Article already removed.',
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
    }): Promise<ContentOperationResult<{ slug: string; section: string; url: string; publishedAt: string; mode: 'create' | 'update' }>> {
        try {
            const { section, slug, draftId, headline } = articleData;

            // 1. Check If File Exists (Detect Mode)
            const articleRelativePath = gitService.getPublishedRelativePath(section, slug);
            const { content: existingFile, sha: existingSha } = await gitService.getFileInfo(articleRelativePath);

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
            logger.error('Failed to publish article', error);
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
        };

        // If bodyBlocks exist, add them to frontmatter (CANONICAL)
        if (data.bodyBlocks && data.bodyBlocks.length > 0) {
            frontmatter.bodyBlocks = data.bodyBlocks;
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
            };
        } catch (error) {
            logger.error('Failed to parse frontmatter', error);
            return null;
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
