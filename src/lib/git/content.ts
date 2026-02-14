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

/** Draft data structure */
export interface DraftData {
    draftId: string;
    headline: string;
    subheadline: string;
    section: string;
    contentType: string;
    body: string;
    tags: string[];
    sources: string[];
    placement: string;
    thumbnail?: string;
    slug?: string;
    savedAt: string;
    createdAt: string;
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
    body: string;
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
     */
    async listDrafts(): Promise<ContentOperationResult<DraftData[]>> {
        try {
            const draftsPath = path.join(process.cwd(), 'src', 'content', 'drafts');
            // This reads directory via API now
            const files = await gitService.listFiles(draftsPath, '.json');

            const drafts: DraftData[] = [];

            for (const filename of files) {
                if (filename === '.gitkeep') continue;

                const absolutePath = path.join(draftsPath, filename);
                const content = await gitService.readFile(absolutePath);

                if (content) {
                    try {
                        const draft = JSON.parse(content) as DraftData;
                        drafts.push(draft);
                    } catch {
                        logger.warn(`Skipping invalid draft file: ${filename}`);
                    }
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
     */
    async listPublishedArticles(): Promise<ContentOperationResult<PublishedArticleData[]>> {
        try {
            const articles: PublishedArticleData[] = [];

            for (const section of VALID_SECTIONS) {
                const sectionPath = path.join(process.cwd(), 'src', 'content', section);
                const files = await gitService.listFiles(sectionPath, '.md');

                for (const filename of files) {
                    const absolutePath = path.join(sectionPath, filename);
                    const content = await gitService.readFile(absolutePath);

                    if (content) {
                        try {
                            const article = this.parseMarkdownFrontmatter(content, section, filename.replace('.md', ''));
                            if (article) {
                                articles.push(article);
                            }
                        } catch {
                            logger.warn(`Skipping invalid article file: ${filename}`);
                        }
                    }
                }
            }

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
     */
    async deleteDraft(draftId: string): Promise<ContentOperationResult> {
        try {
            // Load draft first to get headline for commit message
            const loadResult = await this.loadDraft(draftId);
            const headline = loadResult.data?.headline || 'Untitled';

            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            if (!await gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Draft not found.',
                };
            }

            const staging = createGitStaging();
            // Delete file (stage)
            await gitService.deleteFile(absolutePath, staging);

            // Commit deletion
            await gitService.commitDeletion(relativePath, `Remove draft: ${headline}`, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                userMessage: 'Draft deleted.',
            };
        } catch (error) {
            logger.error('Failed to delete draft', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: gitError.userMessage,
                error: gitError,
            };
        }
    }

    /**
     * DELETE: Remove a published article
     */
    async deletePublishedArticle(section: Section, slug: string): Promise<ContentOperationResult> {
        try {
            const absolutePath = gitService.getPublishedPath(section, slug);
            const relativePath = gitService.getPublishedRelativePath(section, slug);

            if (!await gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Article not found.',
                };
            }

            // Read to get headline for commit message
            const content = await gitService.readFile(absolutePath);
            let headline = slug;
            if (content) {
                const article = this.parseMarkdownFrontmatter(content, section, slug);
                if (article) {
                    headline = article.title;
                }
            }

            // Delete file
            const staging = createGitStaging();
            await gitService.deleteFile(absolutePath, staging);

            // Commit deletion
            await gitService.commitDeletion(relativePath, `Remove article: ${headline}`, staging);

            // Push async
            this.pushAsync();

            return {
                success: true,
                userMessage: 'Article removed.',
            };
        } catch (error) {
            logger.error('Failed to delete published article', error);
            const gitError = gitService.translateError(error);
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
        body: string;
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
                                data: { mode: 'update' } as any
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
                body: updates.body || existingArticle.body,
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
     */
    private generateMarkdownContent(data: {
        headline: string;
        subheadline: string;
        contentType: string;
        body: string;
        tags: string[];
        sources: string[];
        placement: string;
        image?: string;
        publishedAt: string;
        updatedAt?: string;
    }): string {
        const lines: string[] = ['---'];

        lines.push(`title: ${this.escapeYamlString(data.headline)}`);
        lines.push(`subtitle: ${this.escapeYamlString(data.subheadline)}`);
        lines.push(`contentType: ${data.contentType}`);
        if (data.image) {
            lines.push(`image: ${this.escapeYamlString(data.image)}`);
        }
        lines.push(`status: published`);
        lines.push(`publishedAt: ${data.publishedAt}`);
        lines.push(`updatedAt: ${data.updatedAt || 'null'}`);
        lines.push(`placement: ${data.placement}`);

        if (data.tags.length > 0) {
            lines.push('tags:');
            for (const tag of data.tags) {
                lines.push(`  - ${this.escapeYamlString(tag)}`);
            }
        } else {
            lines.push('tags: []');
        }

        if (data.sources.length > 0) {
            lines.push('sources:');
            for (const source of data.sources) {
                lines.push(`  - ${this.escapeYamlString(source)}`);
            }
        } else {
            lines.push('sources: []');
        }

        lines.push('---');

        return `${lines.join('\n')}\n\n${data.body}\n`;
    }

    /**
     * Escape special characters in YAML string values
     */
    private escapeYamlString(value: string): string {
        if (/[:#\[\]{}|>!&*?'"\n\r]/.test(value) || value.startsWith(' ') || value.endsWith(' ')) {
            return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        }
        return value;
    }

    /**
     * Parse markdown frontmatter to extract article data
     */
    private parseMarkdownFrontmatter(content: string, section: string, slug: string): PublishedArticleData | null {
        try {
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (!frontmatterMatch) return null;

            const frontmatter = frontmatterMatch[1];
            const body = frontmatterMatch[2].trim();

            // Simple YAML parsing
            const getValue = (key: string): string => {
                const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
                if (!match) return '';
                let value = match[1].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                return value;
            };

            const getArray = (key: string): string[] => {
                const arrayMatch = frontmatter.match(new RegExp(`^${key}:\\s*\\[(.*)\\]$`, 'm'));
                if (arrayMatch) {
                    // Inline array format
                    const content = arrayMatch[1].trim();
                    if (!content) return [];
                    return content.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
                }

                // Multi-line format
                const lines = frontmatter.split('\n');
                const result: string[] = [];
                let inArray = false;

                for (const line of lines) {
                    if (line.match(new RegExp(`^${key}:`))) {
                        inArray = true;
                        continue;
                    }
                    if (inArray) {
                        if (line.match(/^\s+-\s+/)) {
                            let value = line.replace(/^\s+-\s+/, '').trim();
                            if ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }
                            result.push(value);
                        } else if (!line.match(/^\s+/)) {
                            inArray = false;
                        }
                    }
                }

                return result;
            };

            return {
                slug,
                section,
                title: getValue('title'),
                subtitle: getValue('subtitle'),
                contentType: getValue('contentType'),
                status: getValue('status'),
                publishedAt: getValue('publishedAt'),
                updatedAt: getValue('updatedAt') === 'null' ? null : getValue('updatedAt'),
                placement: getValue('placement'),
                tags: getArray('tags'),
                sources: getArray('sources'),
                image: getValue('image'),
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
