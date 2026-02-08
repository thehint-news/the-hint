/**
 * SourcesList Component
 * 
 * Minimal, editorial design matching The Hint's broadsheet theme.
 * Clean typography, simple borders, no distractions.
 */

interface SourcesListProps {
    sources: string[];
}

export function SourcesList({ sources }: SourcesListProps) {
    if (sources.length === 0) {
        return null;
    }

    return (
        <aside style={{ marginTop: '1.5rem' }}>
            {/* Simple label */}
            <h3 style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#595959',
                marginBottom: '0.75rem',
            }}>
                Sources
            </h3>

            {/* Clean list */}
            <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                borderTop: '1px solid #D9D9D9',
                paddingTop: '0.75rem',
            }}>
                {sources.map((source, index) => (
                    <li
                        key={index}
                        style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '0.875rem',
                            lineHeight: 1.5,
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
