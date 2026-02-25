import Link from 'next/link';
import { kn } from "@/lib/i18n/kn";

export default function NotFound() {
    const sections = [
        { label: kn.sections.politics, href: "/politics" },
        { label: kn.sections["world-affairs"], href: "/world-affairs" },
        { label: kn.sections.crime, href: "/crime" },
        { label: kn.sections.court, href: "/court" },
        { label: kn.sections.opinion, href: "/opinion" },
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-[#F7F6F2]">
            <h2 className="font-serif text-4xl font-black mb-4 text-[#111] tracking-tight">404</h2>
            <p className="font-serif text-xl italic text-[#595959] mb-8 max-w-md leading-relaxed">
                {kn.errors.notFoundDesc}
            </p>

            <div className="w-full max-w-md border-t border-b border-[#D9D9D9] py-8 mb-8">
                <span className="block font-sans text-[10px] font-bold tracking-widest uppercase text-[#8A8A8A] mb-4">
                    {kn.errors.exploreSections}
                </span>
                <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                    {sections.map((section) => (
                        <Link
                            key={section.href}
                            href={section.href}
                            className="font-sans text-sm font-bold text-[#111] hover:text-[#E53935] transition-colors"
                        >
                            {section.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <Link
                href="/"
                className="font-sans text-xs font-bold uppercase tracking-widest border-b-2 border-[#111] pb-1 hover:text-[#595959] hover:border-[#595959] transition-colors flex items-center gap-2"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                {kn.errors.goHome}
            </Link>
        </div>
    );
}
