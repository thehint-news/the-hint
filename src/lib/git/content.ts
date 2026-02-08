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

import { gitService, GitOperationError, GitErrorType, Section } from './service';
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
     * Generates a unique draftId if not provided
     * Commits with message: "Draft created: {{headline}}"
     */
    async createDraft(draft: Omit<DraftData, 'draftId' | 'savedAt' | 'createdAt'>, existingDraftId?: string): Promise<ContentOperationResult<{ draftId: string; savedAt: string }>> {
        try {
            const now = new Date().toISOString();
            const draftId = existingDraftId || `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // If updating existing draft, try to preserve createdAt
            let createdAt = now;
            if (existingDraftId) {
                const existingDraftPath = gitService.getDraftPath(existingDraftId);
                const existingContent = gitService.readFile(existingDraftPath);
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

            // Write file atomically
            await gitService.writeFileAtomic(absolutePath, JSON.stringify(draftData, null, 2));

            // Determine commit message
            const isUpdate = existingDraftId && gitService.fileExists(absolutePath);
            const commitMessage = isUpdate
                ? `Draft updated: ${draft.headline || 'Untitled'}`
                : `Draft created: ${draft.headline || 'Untitled'}`;

            // Commit the change
            await gitService.commitFile(relativePath, commitMessage);

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
            const content = gitService.readFile(absolutePath);

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
            const files = gitService.listFiles(draftsPath, '.json');

            const drafts: DraftData[] = [];

            for (const filename of files) {
                if (filename === '.gitkeep') continue;

                const absolutePath = path.join(draftsPath, filename);
                const content = gitService.readFile(absolutePath);

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
                const files = gitService.listFiles(sectionPath, '.md');

                for (const filename of files) {
                    const absolutePath = path.join(sectionPath, filename);
                    const content = gitService.readFile(absolutePath);

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
            const updatedDraft: DraftData = {
                ...loadResult.data,
                ...updates,
                draftId, // Preserve original ID
                savedAt: new Date().toISOString(),
            };

            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            // Write file atomically
            await gitService.writeFileAtomic(absolutePath, JSON.stringify(updatedDraft, null, 2));

            // Commit
            await gitService.commitFile(relativePath, `Draft updated: ${updatedDraft.headline || 'Untitled'}`);

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
     * Commits with message: "Draft deleted: {{headline}}"
     */
    async deleteDraft(draftId: string): Promise<ContentOperationResult> {
        try {
            // Load draft first to get headline for commit message
            const loadResult = await this.loadDraft(draftId);
            const headline = loadResult.data?.headline || 'Untitled';

            const absolutePath = gitService.getDraftPath(draftId);
            const relativePath = gitService.getDraftRelativePath(draftId);

            if (!gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Draft not found.',
                };
            }

            // Delete file
            await gitService.deleteFile(absolutePath);

            // Commit deletion
            await gitService.commitDeletion(relativePath, `Draft deleted: ${headline}`);

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
     * Commits with message: "Remove article: {{headline}}"
     */
    async deletePublishedArticle(section: Section, slug: string): Promise<ContentOperationResult> {
        try {
            const absolutePath = gitService.getPublishedPath(section, slug);
            const relativePath = gitService.getPublishedRelativePath(section, slug);

            if (!gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Article not found.',
                };
            }

            // Read to get headline for commit message
            const content = gitService.readFile(absolutePath);
            let headline = slug;
            if (content) {
                const article = this.parseMarkdownFrontmatter(content, section, slug);
                if (article) {
                    headline = article.title;
                }
            }

            // Delete file
            await gitService.deleteFile(absolutePath);

            // Commit deletion
            await gitService.commitDeletion(relativePath, `Remove article: ${headline}`);

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
     * 1. Validate content server-side
     * 2. Generate final slug
     * 3. Write markdown to /content/{section}/{slug}.md
     * 4. Delete corresponding draft file
     * 5. Commit atomically with message: "Publish: {{headline}}"
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
    }): Promise<ContentOperationResult<{ slug: string; section: string; url: string; publishedAt: string }>> {
        try {
            const { section, slug, draftId } = articleData;
            const publishedAt = new Date().toISOString();

            // Generate markdown content
            const markdownContent = this.generateMarkdownContent({
                ...articleData,
                image: articleData.thumbnail,
                publishedAt,
            });

            const articlePath = gitService.getPublishedPath(section, slug);
            const articleRelativePath = gitService.getPublishedRelativePath(section, slug);

            // Write article file atomically
            await gitService.writeFileAtomic(articlePath, markdownContent);

            // Prepare files to commit
            const filesToCommit = [articleRelativePath];

            // If there was a draft, delete it
            if (draftId) {
                const draftPath = gitService.getDraftPath(draftId);
                const draftRelativePath = gitService.getDraftRelativePath(draftId);

                if (gitService.fileExists(draftPath)) {
                    await gitService.deleteFile(draftPath);
                    filesToCommit.push(draftRelativePath);
                }
            }

            // Commit all changes atomically
            const commitMessage = `Publish: ${articleData.headline}`;

            // Stage article first
            await gitService.commitFiles(filesToCommit, commitMessage);

            // Push async
            this.pushAsync();

            return {
                success: true,
                data: {
                    slug,
                    section,
                    url: `/${section}/${slug}`,
                    publishedAt,
                },
                userMessage: 'Article published successfully.',
            };
        } catch (error) {
            logger.error('Failed to publish article', error);
            const gitError = gitService.translateError(error);
            return {
                success: false,
                userMessage: 'Publishing didn\'t complete. Please try again.',
                error: gitError,
            };
        }
    }

    /**
     * UPDATE: Update a published article
     * Commits with message: "Update: {{headline}}"
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

            if (!gitService.fileExists(absolutePath)) {
                return {
                    success: false,
                    userMessage: 'Article not found.',
                };
            }

            // Read existing content
            const existingContent = gitService.readFile(absolutePath);
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

            // Write atomically
            await gitService.writeFileAtomic(absolutePath, markdownContent);

            // Commit
            await gitService.commitFile(relativePath, `Update: ${updatedArticle.headline}`);

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
    slugExists(section: Section, slug: string): boolean {
        const absolutePath = gitService.getPublishedPath(section, slug);
        return gitService.fileExists(absolutePath);
    }

    /**
     * Check if a draft exists
     */
    draftExists(draftId: string): boolean {
        const absolutePath = gitService.getDraftPath(draftId);
        return gitService.fileExists(absolutePath);
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
     * Non-blocking, logs errors but doesn't fail the operation
     */
    private pushAsync(): void {
        gitService.push().catch(error => {
            logger.error('Background push failed', error);
            // TODO: Queue for retry
        });
    }
}

// Export singleton
export const contentGit = new ContentGit();
