/**
 * Contact Page
 * 
 * A professional, institutional Contact page for The Hint.
 * Emphasizes accessibility, accountability, and openness.
 * Written in third person with a calm, neutral, and factual tone.
 * 
 * Layout: Simple, text-first, single column with wide margins.
 * Typography: Serif headlines, sans-serif body.
 * Email-based contact only. No forms, icons, or decorative elements.
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: "Contact | The Hint",
    description: "Reach The Hint newsroom for general inquiries, news tips, letters to the editor, corrections, and advertising.",
    openGraph: {
        title: "Contact | The Hint",
        description: "Reach The Hint newsroom for general inquiries, news tips, letters to the editor, corrections, and advertising.",
        type: "website",
        siteName: "The Hint",
    },
};

export default function ContactPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="contact-page">
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
                    <header className="contact-header">
                        <h1 className="contact-title">Contact</h1>
                        <hr className="contact-divider" />
                    </header>

                    {/* General Contact Information */}
                    <section className="contact-section">
                        <p className="contact-lead">
                            The editorial team welcomes correspondence from readers regarding coverage,
                            corrections, and general inquiries. All messages are reviewed by the
                            appropriate department. Due to the volume of correspondence received,
                            not all messages may receive an individual response.
                        </p>
                    </section>

                    {/* General Inquiries */}
                    <section className="contact-section">
                        <h2 className="contact-heading">General Inquiries</h2>
                        <p className="contact-body">
                            For questions about coverage, feedback on articles, or general
                            correspondence with the newsroom, readers may write to the address below.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:contact@thehint.news" className="email-link">
                                contact@thehint.news
                            </a>
                        </p>
                    </section>

                    {/* News Tips */}
                    <section className="contact-section">
                        <h2 className="contact-heading">News Tips</h2>
                        <p className="contact-body">
                            The Hint welcomes information related to matters of public interest.
                            Tips that may contribute to investigative or public-interest reporting
                            are reviewed by the editorial team. Confidentiality is respected where
                            appropriate and where legally permissible.
                        </p>
                        <p className="contact-body">
                            When submitting a tip, readers are encouraged to provide factual,
                            verifiable information and, where possible, supporting documentation.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:newstips@thehint.news" className="email-link">
                                newstips@thehint.news
                            </a>
                        </p>
                    </section>

                    {/* Letters to the Editor */}
                    <section className="contact-section">
                        <h2 className="contact-heading">Letters to the Editor</h2>
                        <p className="contact-body">
                            Readers may submit letters in response to published articles or on
                            matters of public concern. Letters should be concise and include the
                            author&apos;s full name.
                        </p>
                        <p className="contact-body">
                            Submission of a letter does not guarantee publication. Letters selected
                            for publication may be edited for clarity, length, and style. The Hint
                            reserves the right to reject letters that do not meet editorial standards.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:letters@thehint.news" className="email-link">
                                letters@thehint.news
                            </a>
                        </p>
                    </section>

                    {/* Corrections */}
                    <section className="contact-section">
                        <h2 className="contact-heading">Corrections</h2>
                        <p className="contact-body">
                            Accuracy is fundamental to this publication&apos;s mission. Readers who
                            identify factual errors in published content are encouraged to report
                            them. All correction requests are reviewed by the editorial team and
                            addressed promptly.
                        </p>
                        <p className="contact-body">
                            When reporting an error, please include the article title, publication
                            date, and a description of the inaccuracy along with the correct information.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:corrections@thehint.news" className="email-link">
                                corrections@thehint.news
                            </a>
                        </p>
                    </section>

                    {/* Advertising & Business */}
                    <section className="contact-section">
                        <h2 className="contact-heading">Advertising and Business</h2>
                        <p className="contact-body">
                            Commercial and advertising inquiries are handled separately from editorial
                            operations. There is a strict separation between the business and editorial
                            functions of this publication. Advertising does not influence coverage
                            or editorial decisions.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:advertising@thehint.news" className="email-link">
                                advertising@thehint.news
                            </a>
                        </p>
                    </section>

                    {/* Jurisdiction */}
                    <section className="contact-section contact-jurisdiction">
                        <p className="contact-body">
                            This publication operates digitally and serves a global readership.
                        </p>
                    </section>

                    {/* Closing Note */}
                    <section className="contact-section contact-closing">
                        <p className="contact-body">
                            All correspondence is handled in accordance with the publication&apos;s
                            editorial standards and privacy policy.
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
