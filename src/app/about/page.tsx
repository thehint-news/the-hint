/**
 * About Us Page
 * 
 * A professional, institutional About page for The Hint.
 * Written in third person with an editorial, restrained, and authoritative tone.
 * Designed to establish credibility, transparency, and reader trust.
 * 
 * Layout: Simple, text-first, single column.
 * Typography: Serif headlines, sans-serif body.
 * No images, no cards, no marketing language.
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "About Us | The Hint",
    description: "Learn about The Hint's commitment to independent journalism, editorial standards, and accountability to readers.",
    openGraph: {
        title: "About Us | The Hint",
        description: "Learn about The Hint's commitment to independent journalism, editorial standards, and accountability to readers.",
        type: "website",
        siteName: "The Hint",
    },
};

export default function AboutPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="about-page">
                <div className="container-editorial">
                    {/* Back Navigation */}
                    <nav className="page-nav">
                        <Link href="/" className="back-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Home
                        </Link>
                    </nav>

                    {/* Page Header */}
                    <header className="about-header">
                        <h1 className="about-title">About Us</h1>
                        <hr className="about-divider" />
                    </header>

                    {/* Mission Statement */}
                    <section className="about-section">
                        <p className="about-lead">
                            The Hint is dedicated to reporting the news with accuracy, independence, and clarity,
                            serving readers who seek reliable information in an increasingly complex world.
                            Founded on the principle that factual journalism is essential to an informed public,
                            this publication operates without regard to commercial pressure or political favour.
                        </p>
                        <p className="about-body">
                            The purpose of this publication is straightforward: to provide readers with
                            verified, contextual reporting on matters of public interest. Every story
                            published reflects a commitment to thorough research, careful sourcing, and
                            impartial presentation of facts. The Hint serves its readers—not advertisers,
                            institutions, or any particular ideology.
                        </p>
                    </section>

                    {/* What We Cover */}
                    <section className="about-section">
                        <h2 className="about-heading">What We Cover</h2>
                        <p className="about-body">
                            The editorial focus of The Hint centres on matters of genuine public concern:
                            politics, world affairs, crime and courts, public policy, and informed analysis
                            of events that shape society. Coverage prioritises substance over speed, context
                            over sensation, and depth over volume.
                        </p>
                        <p className="about-body">
                            Articles are selected and developed according to their relevance to readers and
                            their significance to the public record. The Hint does not pursue stories for
                            the sake of controversy, nor does it amplify unverified claims. What appears in
                            this publication has been subject to rigorous editorial scrutiny.
                        </p>
                    </section>

                    {/* Editorial Independence */}
                    <section className="about-section">
                        <h2 className="about-heading">Editorial Independence</h2>
                        <p className="about-body">
                            The Hint maintains complete editorial independence. There is no political
                            affiliation, no corporate influence, and no government oversight of any kind.
                            Editorial decisions are made solely by the newsroom, based on journalistic
                            merit and public interest.
                        </p>
                        <p className="about-body">
                            Opinion and analysis content is clearly labelled and published separately
                            from news reporting. Readers can trust that news coverage is factual and
                            impartial, while opinion pieces represent clearly identified perspectives
                            that are distinct from the publication&apos;s reporting.
                        </p>
                        <p className="about-body">
                            This separation between news and opinion is fundamental to maintaining
                            credibility. The Hint believes readers are best served when they can
                            distinguish fact from commentary.
                        </p>
                    </section>

                    {/* Corrections & Accountability */}
                    <section className="about-section">
                        <h2 className="about-heading">Corrections and Accountability</h2>
                        <p className="about-body">
                            When errors occur, they are corrected promptly and transparently. The Hint
                            acknowledges that accuracy is paramount, and that mistakes—when they
                            happen—must be addressed openly. Corrections are published with clear
                            notation of what was changed and why.
                        </p>
                        <p className="about-body">
                            This publication does not quietly alter articles or remove content without
                            explanation. Readers have a right to know when information has been updated,
                            and The Hint upholds that standard as a matter of principle.
                        </p>
                    </section>

                    {/* Audience Commitment */}
                    <section className="about-section">
                        <h2 className="about-heading">Commitment to Readers</h2>
                        <p className="about-body">
                            The Hint is written for readers who value clarity, accuracy, and
                            straightforward reporting. This publication does not employ misleading
                            headlines, does not exaggerate for effect, and does not pursue engagement
                            at the expense of truth.
                        </p>
                        <p className="about-body">
                            Every article is sourced with care. Claims are attributed. Context is provided.
                            Readers are treated as intelligent individuals capable of drawing their
                            own conclusions when presented with reliable information.
                        </p>
                        <p className="about-body">
                            There are no hidden agendas. The Hint exists to inform, not to persuade.
                            The publication&apos;s only loyalty is to the facts and to the readers who
                            depend on them.
                        </p>
                    </section>

                    {/* Closing Statement */}
                    <section className="about-section about-closing">
                        <p className="about-body">
                            The Hint operates in the tradition of serious, public-interest journalism.
                            Its work is guided by the principles of integrity, accuracy, and service
                            to an informed citizenry. In an era of uncertainty and noise, this publication
                            remains committed to the quiet, essential work of telling the truth.
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
