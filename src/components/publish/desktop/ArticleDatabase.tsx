'use client';

/**
 * Article Database Component
 * Table view for browsing and managing articles
 * 
 * Columns: Title, Section, Status, Placement, Last Edited, Published Date
 * Row actions: Edit, Duplicate, Delete
 * Filtering: Status filter, Section dropdown, Headline search
 * 
 * OPTIMISTIC UI:
 * - Rows fade out instantly on delete (200ms animation)
 * - Delete button shows spinner during operation
 * - Button is disabled while delete is in-flight
 * - If delete fails, row is restored at original position
 */

import { useState, useMemo } from 'react';
import { ArticleEntry, SECTIONS } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { ArticleDatabaseSkeleton } from '@/components/skeleton';
import styles from './ArticleDatabase.module.css';

interface ArticleDatabaseProps {
    /** List of articles to display */
    articles: ArticleEntry[];
    /** Whether data is loading */
    isLoading: boolean;
    /** Handler for editing an article */
    onEdit: (article: ArticleEntry) => void;
    /** Handler for duplicating an article */
    onDuplicate: (article: ArticleEntry) => void;
    /** Handler for deleting an article */
    onDelete: (article: ArticleEntry) => void;
    /** Set of article IDs currently being deleted (optimistic) */
    deletingIds?: Set<string>;
}

export function ArticleDatabase({
    articles,
    isLoading,
    onEdit,
    onDuplicate,
    onDelete,
    deletingIds = new Set(),
}: ArticleDatabaseProps) {
    // Filter state
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
    const [sectionFilter, setSectionFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Confirm dialog state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        article: ArticleEntry | null;
    }>({ isOpen: false, article: null });

    /**
     * Format date for display
     */
    const formatDate = (dateString?: string): string => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    /**
     * Format time for display
     */
    const formatTime = (dateString?: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    /**
     * Get placement label
     */
    const getPlacementLabel = (placement: string): string => {
        switch (placement) {
            case 'lead': return 'Lead';
            case 'top': return 'Top';
            default: return 'Normal';
        }
    };

    /**
     * Apply filters to articles
     */
    const filteredArticles = useMemo(() => {
        let result = articles;

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(a => a.status === statusFilter);
        }

        // Filter by section
        if (sectionFilter !== 'all') {
            result = result.filter(a => a.section === sectionFilter);
        }

        // Filter by search query (client-side)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(a =>
                a.title.toLowerCase().includes(query)
            );
        }

        return result;
    }, [articles, statusFilter, sectionFilter, searchQuery]);

    /**
     * Get section label
     */
    const getSectionLabel = (value: string): string => {
        const section = SECTIONS.find(s => s.value === value);
        return section?.label || value;
    };

    /**
     * Open delete confirmation dialog
     */
    const handleDeleteClick = (article: ArticleEntry) => {
        // Block if already deleting this article
        if (deletingIds.has(article.id)) return;
        setDeleteConfirm({ isOpen: true, article });
    };

    /**
     * Confirm delete action
     */
    const handleDeleteConfirm = () => {
        if (deleteConfirm.article) {
            onDelete(deleteConfirm.article);
        }
        setDeleteConfirm({ isOpen: false, article: null });
    };

    /**
     * Cancel delete action
     */
    const handleDeleteCancel = () => {
        setDeleteConfirm({ isOpen: false, article: null });
    };

    return (
        <div className={styles.database}>
            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Section</label>
                    <select
                        className={styles.filterSelect}
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                    >
                        <option value="all">All Sections</option>
                        {SECTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter - Dropdown for desktop */}
                <div className={`${styles.filterGroup} ${styles.statusSelectGroup}`}>
                    <label className={styles.filterLabel}>Status</label>
                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Drafts</option>
                        <option value="published">Published</option>
                    </select>
                </div>

                {/* Status Filter - Pills for mobile (more touch-friendly) */}
                <div className={`${styles.filterGroup} ${styles.statusPillsGroup}`}>
                    <div className={styles.statusPills}>
                        <button
                            type="button"
                            className={`${styles.statusPill} ${statusFilter === 'all' ? styles.statusPillActive : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`${styles.statusPill} ${statusFilter === 'draft' ? styles.statusPillActive : ''}`}
                            onClick={() => setStatusFilter('draft')}
                        >
                            Drafts
                        </button>
                        <button
                            type="button"
                            className={`${styles.statusPill} ${statusFilter === 'published' ? styles.statusPillActive : ''}`}
                            onClick={() => setStatusFilter('published')}
                        >
                            Published
                        </button>
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Search</label>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by headline..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.resultCount}>
                    {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                {isLoading ? (
                    <ArticleDatabaseSkeleton />
                ) : filteredArticles.length === 0 ? (
                    <div className={styles.empty}>
                        {searchQuery || sectionFilter !== 'all' || statusFilter !== 'all'
                            ? 'No articles match your filters.'
                            : 'No articles found.'}
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.thTitle}>Title</th>
                                <th className={styles.thSection}>Section</th>
                                <th className={styles.thStatus}>Status</th>
                                <th className={styles.thPlacement}>Placement</th>
                                <th className={styles.thDate}>Last Edited</th>
                                <th className={styles.thDate}>Published</th>
                                <th className={styles.thActions}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArticles.map((article) => {
                                const isDeleting = deletingIds.has(article.id);
                                return (
                                    <tr
                                        key={article.id}
                                        className={`${styles.row} ${isDeleting ? styles.rowDeleting : ''}`}
                                    >
                                        <td className={styles.cellTitle}>
                                            <button
                                                type="button"
                                                className={styles.titleLink}
                                                onClick={() => onEdit(article)}
                                                disabled={isDeleting}
                                            >
                                                {article.title || 'Untitled'}
                                            </button>
                                        </td>
                                        <td className={styles.cellSection}>
                                            {getSectionLabel(article.section)}
                                        </td>
                                        <td className={styles.cellStatus}>
                                            <span className={article.status === 'published' ? styles.statusPublished : styles.statusDraft}>
                                                {article.status === 'published' ? 'Published' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className={styles.cellPlacement}>
                                            {article.placement !== 'standard' ? (
                                                <span className={`${styles.badge} ${article.placement === 'lead' ? styles.badgeLead : styles.badgeTop}`}>
                                                    {getPlacementLabel(article.placement)}
                                                </span>
                                            ) : (
                                                <span className={styles.textMuted}>—</span>
                                            )}
                                        </td>
                                        <td className={styles.cellDate}>
                                            <span className={styles.dateMain}>{formatDate(article.lastEdited)}</span>
                                            <span className={styles.dateTime}>{formatTime(article.lastEdited)}</span>
                                        </td>
                                        <td className={styles.cellDate}>
                                            {article.publishedAt ? (
                                                <>
                                                    <span className={styles.dateMain}>{formatDate(article.publishedAt)}</span>
                                                    <span className={styles.dateTime}>{formatTime(article.publishedAt)}</span>
                                                </>
                                            ) : (
                                                <span className={styles.datePlaceholder}>—</span>
                                            )}
                                        </td>
                                        <td className={styles.cellActions}>
                                            <div className={styles.rowActions}>
                                                <button
                                                    type="button"
                                                    className={styles.actionBtn}
                                                    onClick={() => onEdit(article)}
                                                    title="Edit"
                                                    disabled={isDeleting}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.actionBtn}
                                                    onClick={() => onDuplicate(article)}
                                                    title="Duplicate"
                                                    disabled={isDeleting}
                                                >
                                                    Duplicate
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.actionBtn} ${styles.actionDelete} ${isDeleting ? styles.actionDeleting : ''}`}
                                                    onClick={() => handleDeleteClick(article)}
                                                    title="Delete"
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? (
                                                        <span className={styles.deleteSpinner}>
                                                            <span className={styles.spinnerDot} />
                                                            Removing…
                                                        </span>
                                                    ) : (
                                                        'Delete'
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title={deleteConfirm.article?.status === 'published'
                    ? 'Delete Published Article?'
                    : 'Delete Draft?'}
                message={deleteConfirm.article?.status === 'published'
                    ? `This will permanently remove the published article:\n\n"${deleteConfirm.article?.title}"\n\nThis action cannot be undone. The article will be removed from the live site.`
                    : `This will permanently delete the draft:\n\n"${deleteConfirm.article?.title}"`}
                confirmText="Delete"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
}
