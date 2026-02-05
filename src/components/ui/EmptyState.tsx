import Link from "next/link";

interface EmptyStateProps {
    title?: string;
    message?: string;
    actionLabel?: string;
    actionHref?: string;
}

export function EmptyState({
    title = "No stories found",
    message = "We typically publish new stories daily. Check back soon or explore our other sections.",
    actionLabel = "Return Home",
    actionHref = "/",
}: EmptyStateProps) {
    return (
        <div className="py-16 px-4 text-center border-t border-b border-neutral-200 bg-[#F9F9F9] my-8">
            <div className="max-w-md mx-auto">
                <h3 className="font-serif text-2xl font-bold text-[#111] mb-3">
                    {title}
                </h3>
                <p className="font-serif text-base text-[#666] italic mb-6 leading-relaxed">
                    {message}
                </p>
                <Link
                    href={actionHref}
                    className="inline-block font-sans text-xs font-bold uppercase tracking-widest border border-[#111] px-6 py-3 hover:bg-[#111] hover:text-[#fff] transition-colors"
                >
                    {actionLabel}
                </Link>
            </div>
        </div>
    );
}
