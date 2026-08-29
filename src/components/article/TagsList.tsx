/**
 * TagsList (Keywords) Component
 * 
 * Minimal, editorial design for rendering article tags/keywords.
 */

import { kn } from "@/lib/i18n";

interface TagsListProps {
    tags: string[];
}

export function TagsList({ tags }: TagsListProps) {
    if (!tags || tags.length === 0) {
        return null;
    }

    const t = kn;

    return (
        <aside style={{ margin: '2.5rem 0' }}>
            <h3 style={{
                fontFamily: 'var(--font-sans-full)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#595959',
                marginBottom: '0.75rem',
            }}>
                {t.article.keywords}
            </h3>

            <div className="flex flex-wrap gap-2 border-t border-[#E5E5E5] pt-3">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="editorial-tag-pill"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
        </aside>
    );
}
