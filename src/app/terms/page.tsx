/**
 * Terms & Conditions Page
 * 
 * A professional, legally sound Terms & Conditions page for The Hint.
 * Written in plain, understandable language while maintaining legal structure.
 * Designed to build reader trust through transparency and clarity.
 * 
 * Layout: Simple, text-first, single column with wide margins.
 * Typography: Serif headlines, sans-serif body.
 * Tone: Formal but readable, neutral and non-confrontational.
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms & Conditions | The Hint",
    description: "Read the Terms and Conditions governing use of The Hint website, including content usage, intellectual property, and user conduct.",
    openGraph: {
        title: "Terms & Conditions | The Hint",
        description: "Read the Terms and Conditions governing use of The Hint website, including content usage, intellectual property, and user conduct.",
        type: "website",
        siteName: "The Hint",
    },
};

export default function TermsPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="terms-page">
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
                    <header className="terms-header">
                        <h1 className="terms-title">Terms &amp; Conditions</h1>
                        <hr className="terms-divider" />
                    </header>

                    {/* Introduction */}
                    <section className="terms-section">
                        <p className="terms-lead">
                            These Terms and Conditions govern access to and use of this website.
                            By using the site, readers agree to these terms. All visitors are
                            encouraged to review these terms carefully, as they outline the
                            expectations and responsibilities that apply when accessing content
                            published by The Hint.
                        </p>
                    </section>

                    {/* Use of Content */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Use of Content</h2>
                        <p className="terms-body">
                            All articles, text, images, graphics, and other media published on
                            this website are protected by copyright and other applicable laws.
                            Content is provided for personal, non-commercial use only.
                        </p>
                        <p className="terms-body">
                            Readers may read, share links to, and quote brief excerpts from
                            articles for purposes such as commentary, criticism, or news reporting,
                            provided appropriate attribution is given. However, reproducing,
                            republishing, scraping, or redistributing content in whole or in
                            substantial part without prior written permission is not permitted.
                        </p>
                        <p className="terms-body">
                            For permissions or licensing inquiries, please contact the editorial
                            team through the Contact page.
                        </p>
                    </section>

                    {/* Intellectual Property */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Intellectual Property</h2>
                        <p className="terms-body">
                            The Hint retains all rights to its content, including but not limited
                            to articles, photographs, illustrations, and audiovisual materials.
                            The publication&apos;s name, logo, and associated branding are protected
                            and may not be used without express written permission.
                        </p>
                        <p className="terms-body">
                            Third-party content featured on this website remains the property of
                            its respective owners and is used in accordance with applicable
                            agreements or fair use principles.
                        </p>
                    </section>

                    {/* Accuracy & Editorial Disclaimer */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Accuracy and Editorial Standards</h2>
                        <p className="terms-body">
                            The Hint is committed to accuracy in journalism. Articles are produced
                            with care, thorough research, and verification. Every reasonable effort
                            is made to ensure that information published is correct at the time of
                            publication.
                        </p>
                        <p className="terms-body">
                            However, journalism operates under time constraints, and errors may
                            occasionally occur. When mistakes are identified, they are corrected
                            promptly and transparently.
                        </p>
                        <p className="terms-body">
                            Content published on this website is intended to inform and is not a
                            substitute for professional advice—whether legal, financial, medical,
                            or otherwise. Readers should not make decisions based solely on
                            information in articles without seeking appropriate professional
                            guidance. The Hint is not liable for any actions taken or decisions
                            made based on published content.
                        </p>
                    </section>

                    {/* Opinion Content Clarification */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Opinion and Analysis</h2>
                        <p className="terms-body">
                            Opinion articles, columns, and analysis pieces represent the views
                            of their individual authors and do not necessarily reflect the
                            institutional position of The Hint. Such content is clearly labelled
                            and published separately from news reporting.
                        </p>
                        <p className="terms-body">
                            This distinction between news and opinion is fundamental to
                            maintaining editorial integrity. Readers can trust that news coverage
                            is factual and impartial, while opinion pieces offer clearly
                            identified perspectives.
                        </p>
                    </section>

                    {/* External Links */}
                    <section className="terms-section">
                        <h2 className="terms-heading">External Links</h2>
                        <p className="terms-body">
                            Articles may include links to third-party websites for reference,
                            context, or additional information. These links are provided as a
                            convenience to readers.
                        </p>
                        <p className="terms-body">
                            The Hint does not control and is not responsible for the content,
                            accuracy, or practices of external websites. The inclusion of a
                            link does not imply endorsement of the linked site or its content.
                            Readers access external links at their own discretion and risk.
                        </p>
                    </section>

                    {/* User Conduct */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Acceptable Use</h2>
                        <p className="terms-body">
                            Visitors to this website agree to use it responsibly and lawfully.
                            The following activities are prohibited:
                        </p>
                        <ul className="terms-list">
                            <li>Attempting to disrupt, interfere with, or compromise the website&apos;s functionality or security</li>
                            <li>Using automated systems to scrape, harvest, or collect content without permission</li>
                            <li>Engaging in any activity that violates applicable laws or regulations</li>
                            <li>Misrepresenting oneself or impersonating others when interacting with the publication</li>
                        </ul>
                        <p className="terms-body">
                            The Hint reserves the right to restrict access to individuals who
                            violate these terms.
                        </p>
                    </section>

                    {/* Subscription & Email Communications */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Email Communications</h2>
                        <p className="terms-body">
                            Readers may voluntarily subscribe to receive email updates about
                            newly published content. Subscription is entirely optional.
                        </p>
                        <p className="terms-body">
                            Email communications are related to editorial content and
                            publication updates. Every email includes a clear option to
                            unsubscribe, and requests to unsubscribe are honoured promptly.
                        </p>
                        <p className="terms-body">
                            Email addresses and subscriber information are handled in accordance
                            with the publication&apos;s Privacy Policy.
                        </p>
                    </section>

                    {/* Limitation of Liability */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Limitation of Liability</h2>
                        <p className="terms-body">
                            Access to this website is provided on an &quot;as is&quot; basis without
                            warranties of any kind, whether express or implied. The Hint does
                            not guarantee uninterrupted access or that the website will be
                            free from errors.
                        </p>
                        <p className="terms-body">
                            To the extent permitted by law, The Hint shall not be liable for
                            any indirect, incidental, consequential, or special damages arising
                            from the use of or inability to use this website or its content.
                        </p>
                    </section>

                    {/* Changes to These Terms */}
                    <section className="terms-section">
                        <h2 className="terms-heading">Changes to These Terms</h2>
                        <p className="terms-body">
                            These Terms and Conditions may be updated periodically to reflect
                            changes in practices, legal requirements, or editorial policy.
                            Updates will be posted on this page.
                        </p>
                        <p className="terms-body">
                            Continued use of the website following any changes constitutes
                            acceptance of the revised terms. Readers are encouraged to review
                            this page periodically.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section className="terms-section terms-governance">
                        <h2 className="terms-heading">Governing Law</h2>
                        <p className="terms-body">
                            These Terms and Conditions are governed by and construed in
                            accordance with the applicable laws of the jurisdiction in which
                            the publication operates. Any disputes arising from or relating
                            to these terms shall be subject to the exclusive jurisdiction of
                            the appropriate courts in that jurisdiction.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section className="terms-section terms-closing">
                        <p className="terms-body">
                            Questions regarding these Terms and Conditions may be directed
                            through the{" "}
                            <Link href="/contact" className="terms-link">
                                Contact page
                            </Link>
                            .
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
