/**
 * CorrectionNotice Component
 * 
 * Renders a correction or update notice for articles that have been modified.
 * Only displays when an update date is provided.
 * 
 * NO business logic, NO imports from lib/content.
 */

import { kn } from "@/lib/i18n/kn";

interface CorrectionNoticeProps {
    updatedAt: string | null;
    correctionText?: string;
}

export function CorrectionNotice({ updatedAt, correctionText }: CorrectionNoticeProps) {
    if (!updatedAt) {
        return null;
    }

    const formattedDate = new Date(updatedAt).toLocaleDateString('kn-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <aside className="border border-current p-6 mb-12">
            <h2 className="text-base font-bold uppercase tracking-wide mb-2">
                {kn.article.correction}
            </h2>
            <p className="text-base mb-2">
                <span className="font-semibold">{kn.time.updatedOnLabel}</span> {formattedDate}
            </p>
            {correctionText && (
                <p className="text-base">{correctionText}</p>
            )}
            {!correctionText && (
                <p className="text-base">
                    {kn.article.updatedNotice}
                </p>
            )}
        </aside>
    );
}
