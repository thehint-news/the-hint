/**
 * SourcesList Component
 * 
 * Minimal, editorial design matching The Hint's broadsheet theme.
 */

import { kn } from "@/lib/i18n";

interface SourcesListProps {
    sources: string[];
}

export function SourcesList({ sources }: SourcesListProps) {
    if (!sources || sources.length === 0) {
        return null;
    }

    const t = kn;

    return (
        <aside style={{ margin: '2.5rem 0' }}>
            {/* Simple label */}
            <h3 style={{
                fontFamily: 'var(--font-sans-full)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#595959',
                marginBottom: '0.75rem',
            }}>
                {t.article.sources}
            </h3>

            {/* Clean list */}
            <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                borderTop: '1px solid #E5E5E5',
                paddingTop: '0.75rem',
            }}>
                {sources.map((source, index) => (
                    <li
                        key={index}
                        style={{
                            fontFamily: 'var(--font-serif-full)',
                            fontSize: '0.9375rem',
                            lineHeight: 1.6,
                            color: '#2B2B2B',
                            marginBottom: '0.5rem',
                        }}
                    >
                        {source}
                    </li>
                ))}
            </ul>
        </aside>
    );
}
