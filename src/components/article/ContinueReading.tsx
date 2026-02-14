import Link from 'next/link';
import { Recommendation } from '@/lib/content/recommendations';

interface ContinueReadingProps {
    items: Recommendation[];
}

// Icons (Inline SVG for performance and no-deps)
const Icons = {
    ArrowRight: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform transition-transform group-hover:translate-x-1">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    ),
    Star: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="mr-1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
    Zap: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="mr-1">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
    ),
    Trending: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B0000]">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    ),
    BookOpen: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-neutral-400">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
    )
};

// Thumbnail extraction is now centralized in the data layer (reader.ts)
// article.image is guaranteed to be populated with first body image if no explicit image

export function ContinueReading({ items }: ContinueReadingProps) {
    if (!items || items.length === 0) return null;

    return (
        <section
            aria-label="Continue Reading"
            className="w-full bg-[#F5F5F0] py-8 mt-0 border-t border-neutral-200"
        >
            <div className="max-w-[900px] mx-auto px-6">

                {/* Section Header - Smart Grid Alignment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b border-neutral-300 pb-6 items-end relative">
                    <div className="md:col-span-2 relative">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="block font-sans text-[10px] font-bold tracking-[0.15em] text-[#8B0000] uppercase">
                                Continue Reading
                            </span>
                            {/* Decorative Line */}
                            <div className="h-[1px] w-12 bg-[#8B0000]/30 hidden sm:block"></div>
                        </div>
                        <div className="flex items-end gap-3">
                            <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 font-bold tracking-tighter leading-[0.9] text-left relative z-10">
                                From Our<br />Coverage
                            </h2>
                            <div className="mb-2 animate-pulse hidden md:block">
                                <Icons.Trending />
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-1 md:text-right pl-0 md:pl-6 text-left">
                        <p className="font-serif text-neutral-500 text-sm md:text-base leading-relaxed italic border-l-2 md:border-l-0 md:border-r-2 border-[#8B0000] pl-4 md:pl-0 md:pr-4">
                            "Curated stories you might have missed."
                        </p>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="text-left grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6">
                    {items.map((item) => {
                        const imageUrl = item.article.image;
                        const isLeadLayout = item.type === 'lead';

                        // SPECIAL LAYOUT: LEAD STORY (Only if type is explicitly 'lead')
                        if (isLeadLayout) {
                            return (
                                <Link
                                    key={item.article.id}
                                    href={`/${item.article.section}/${item.article.id}`}
                                    className="
                                        group relative flex flex-col justify-end
                                        h-[280px] w-full
                                        rounded-lg overflow-hidden
                                        bg-neutral-900 shadow-sm md:hover:shadow-xl md:hover:-translate-y-1
                                        active:scale-[0.98] transition-all duration-300 ease-out
                                    "
                                >
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            alt={item.article.title}
                                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 md:group-hover:scale-105 transition-all duration-700 ease-out"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>

                                    <div className="relative z-10 p-5 flex flex-col h-full justify-end">
                                        <div className="mb-auto pt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest text-white uppercase bg-[#8B0000] rounded-sm shadow-lg">
                                                <Icons.Star />
                                                LEAD STORY
                                            </span>
                                        </div>

                                        <h3 className="font-serif text-2xl font-bold leading-tight text-white mb-2 line-clamp-3 md:group-hover:text-[#F5F5F0] transition-colors">
                                            {item.article.title}
                                        </h3>

                                        {/* CTA: Visible on Mobile, Slide-up on Desktop */}
                                        <div className="flex items-center text-[10px] text-neutral-300 font-sans mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-y-2 md:group-hover:translate-y-0">
                                            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                Read Article <Icons.ArrowRight />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        }

                        // STANDARD LAYOUT (Top Story, Section Story, or Fallback)
                        return (
                            <Link
                                key={item.article.id}
                                href={`/${item.article.section}/${item.article.id}`}
                                className="
                                    group flex flex-col
                                    h-[280px] w-full
                                    rounded-lg overflow-hidden
                                    bg-white shadow-sm hover:shadow-lg md:hover:-translate-y-1
                                    active:scale-[0.99] active:bg-neutral-50
                                    transition-all duration-300 ease-out
                                    border border-neutral-100 relative
                                "
                            >
                                <div className="relative h-32 w-full overflow-hidden bg-neutral-100 md:group-hover:brightness-105 transition-all">
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            alt={item.article.title}
                                            className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-700 ease-out"
                                        />
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded-sm shadow-md ring-1 ring-black/5 ${item.type === 'top'
                                            ? 'bg-white text-neutral-900'
                                            : 'bg-white text-neutral-900'
                                            }`}>
                                            <Icons.Zap />
                                            {item.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col flex-grow p-5 relative">
                                    {/* Decorative Bar: Visible on Mobile, Slides on Desktop */}
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-[#8B0000] transform scale-x-100 md:scale-x-0 md:group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

                                    <h3 className="font-serif text-lg font-bold leading-snug text-neutral-900 mb-2 line-clamp-3 md:group-hover:text-[#8B0000] transition-colors">
                                        {item.article.title}
                                    </h3>

                                    <div className="mt-auto flex items-center justify-between text-[10px] text-neutral-400 font-sans border-t border-neutral-50 pt-3">
                                        <span className="flex items-center gap-1 text-[#8B0000] md:text-neutral-400 md:group-hover:text-[#8B0000] transition-colors">
                                            Read Now <Icons.ArrowRight />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
