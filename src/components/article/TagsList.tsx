/**
 * TagsList (Keywords) Component
 * 
 * Minimal, editorial design for rendering article tags/keywords.
 */

import { Language } from "@/lib/i18n/language";
import { getTranslationsForLang } from "@/lib/i18n";

interface TagsListProps {
    tags: string[];
    lang: Language;
}

export function TagsList({ tags, lang }: TagsListProps) {
    if (!tags || tags.length === 0) {
        return null;
    }

    const t = getTranslationsForLang(lang);

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

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                borderTop: '1px solid #E5E5E5',
                paddingTop: '0.75rem',
            }}>
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        style={{
                            fontFamily: 'var(--font-sans-full)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.375rem 0.875rem',
                            backgroundColor: '#F7F7F7',
                            color: '#404040',
                            borderRadius: '9999px',
                            border: '1px solid #E5E5E5',
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </aside>
    );
}
