/**
 * Privacy Policy Page
 * 
 * A professional, reader-friendly Privacy Policy page for The Hint.
 * Written in plain, understandable language that prioritizes trust and transparency.
 * Designed to clearly explain data collection, usage, and protection practices.
 * 
 * Layout: Simple, text-first, single column with wide margins.
 * Typography: Serif headlines, sans-serif body.
 * Tone: Calm, clear, and factual - written for readers, not lawyers.
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy | The Hint",
    description: "Learn how The Hint collects, uses, and protects your personal information. Our privacy practices prioritize transparency and reader trust.",
    openGraph: {
        title: "Privacy Policy | The Hint",
        description: "Learn how The Hint collects, uses, and protects your personal information. Our privacy practices prioritize transparency and reader trust.",
        type: "website",
        siteName: "The Hint",
    },
};

export default function PrivacyPolicyPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="privacy-page">
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
                    <header className="privacy-header">
                        <h1 className="privacy-title">Privacy Policy</h1>
                        <hr className="privacy-divider" />
                    </header>

                    {/* Introduction */}
                    <section className="privacy-section">
                        <p className="privacy-lead">
                            The Hint values reader privacy. This Privacy Policy explains how
                            personal information is collected, used, and protected when readers
                            visit and interact with this website. This policy applies to all
                            users of the site, regardless of how they access it.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Information We Collect</h2>

                        <h3 className="privacy-subheading">Information You Provide</h3>
                        <p className="privacy-body">
                            When readers choose to interact with this website, certain information
                            may be provided voluntarily. This includes:
                        </p>
                        <ul className="privacy-list">
                            <li>Email addresses when subscribing to receive updates about new articles</li>
                            <li>Messages sent through the Contact page or news tips submissions</li>
                        </ul>
                        <p className="privacy-body">
                            No account registration is required to read articles published on this
                            website. Readers may access all published content without providing any
                            personal information.
                        </p>

                        <h3 className="privacy-subheading">Information Collected Automatically</h3>
                        <p className="privacy-body">
                            When readers visit this website, limited technical information may be
                            collected automatically to help maintain and improve the site. This
                            includes:
                        </p>
                        <ul className="privacy-list">
                            <li>Browser type and version</li>
                            <li>Device type</li>
                            <li>Pages viewed during the visit</li>
                            <li>Approximate geographic location (non-precise, such as city or region)</li>
                        </ul>
                        <p className="privacy-body">
                            This information is collected solely to understand how readers use the
                            website and to improve its performance and content.
                        </p>
                    </section>

                    {/* How Information Is Used */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">How Information Is Used</h2>
                        <p className="privacy-body">
                            Personal information collected through this website is used for the
                            following purposes:
                        </p>
                        <ul className="privacy-list">
                            <li>To deliver email updates when new articles are published</li>
                            <li>To respond to reader inquiries and messages</li>
                            <li>To understand readership patterns and interests</li>
                            <li>To improve the website&apos;s performance and usability</li>
                        </ul>
                        <p className="privacy-body privacy-emphasis">
                            Personal information is not sold to third parties. Reader data is not
                            used for advertising profiling or targeted marketing purposes.
                        </p>
                    </section>

                    {/* Email Communications */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Email Communications</h2>
                        <p className="privacy-body">
                            Email updates are sent only to readers who have explicitly opted in to
                            receive them. These communications relate to newly published content or
                            important updates about the publication.
                        </p>
                        <p className="privacy-body">
                            Every email includes an option to unsubscribe. Unsubscribe requests are
                            processed promptly, and no further emails will be sent after such a
                            request is received.
                        </p>
                        <p className="privacy-body">
                            Subscribers remain in control of their inbox at all times.
                        </p>
                    </section>

                    {/* Cookies & Analytics */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Cookies and Analytics</h2>
                        <p className="privacy-body">
                            This website uses a limited number of cookies to ensure proper
                            functionality and to gather basic analytics about readership. Cookies
                            are small text files stored in your browser that help the website
                            recognize return visitors and remember preferences.
                        </p>
                        <p className="privacy-body">
                            Analytics tools are used to measure how readers interact with the
                            website, including which articles are most read and how visitors
                            navigate between pages. This information helps improve the reading
                            experience.
                        </p>
                        <p className="privacy-body">
                            This website does not use cross-site tracking cookies. No advertising
                            cookies are employed. Readers may control cookie settings through
                            their browser preferences.
                        </p>
                    </section>

                    {/* Data Sharing */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Data Sharing</h2>
                        <p className="privacy-body">
                            Personal information is not sold or shared with third parties for
                            marketing or commercial purposes.
                        </p>
                        <p className="privacy-body">
                            Information may be shared only in the following limited circumstances:
                        </p>
                        <ul className="privacy-list">
                            <li>With service providers who assist in operating the website, such as
                                email delivery services, and only to the extent necessary for them to
                                perform their functions</li>
                            <li>When required by law, such as in response to a valid legal request
                                from authorities</li>
                        </ul>
                        <p className="privacy-body">
                            Any service providers who receive personal information are required to
                            handle it in accordance with applicable privacy standards.
                        </p>
                    </section>

                    {/* Data Security */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Data Security</h2>
                        <p className="privacy-body">
                            Reasonable technical and organizational measures are used to protect
                            personal information from unauthorized access, alteration, disclosure,
                            or destruction.
                        </p>
                        <p className="privacy-body">
                            Access to personal information is limited to authorized personnel who
                            require it to operate the website and respond to reader inquiries.
                        </p>
                        <p className="privacy-body">
                            While every effort is made to protect personal information, no system
                            is completely secure. Care is taken at every step, but absolute
                            security cannot be guaranteed.
                        </p>
                    </section>

                    {/* Data Retention */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Data Retention</h2>
                        <p className="privacy-body">
                            Email addresses are retained for as long as the subscription remains
                            active. When a reader unsubscribes, their email address is removed
                            from the mailing list.
                        </p>
                        <p className="privacy-body">
                            Messages submitted through the Contact page may be retained for
                            record-keeping purposes and to allow for follow-up if needed.
                        </p>
                        <p className="privacy-body">
                            Readers may request removal of their personal information at any time
                            by contacting the publication.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section className="privacy-section">
                        <h2 className="privacy-heading">Your Rights</h2>
                        <p className="privacy-body">
                            Readers have certain rights regarding their personal information:
                        </p>
                        <ul className="privacy-list">
                            <li>The right to unsubscribe from email communications at any time</li>
                            <li>The right to request deletion of personal data held by the publication</li>
                            <li>The right to inquire about what personal information is stored</li>
                        </ul>
                        <p className="privacy-body">
                            To exercise any of these rights, please reach out through the{" "}
                            <Link href="/contact" className="privacy-link">
                                Contact page
                            </Link>
                            . Requests will be addressed as promptly as possible.
                        </p>
                    </section>

                    {/* Changes to This Policy */}
                    <section className="privacy-section privacy-updates">
                        <h2 className="privacy-heading">Changes to This Policy</h2>
                        <p className="privacy-body">
                            This Privacy Policy may be updated from time to time to reflect changes
                            in practices, legal requirements, or how the website operates. Updates
                            will be posted on this page.
                        </p>
                        <p className="privacy-body">
                            Continued use of the website following any changes constitutes
                            acceptance of the revised policy. Readers are encouraged to review
                            this page periodically to stay informed.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section className="privacy-section privacy-closing">
                        <p className="privacy-body">
                            Questions regarding this Privacy Policy may be directed through the{" "}
                            <Link href="/contact" className="privacy-link">
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
