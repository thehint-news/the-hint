/**
 * Contact Page
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: "ಸಂಪರ್ಕ",
    description: "ಸಾಮಾನ್ಯ ವಿಚಾರಣೆಗಳು, ಸುದ್ದಿ ಸುಳಿವುಗಳು, ಸಂಪಾದಕರಿಗೆ ಪತ್ರಗಳು, ತಿದ್ದುಪಡಿಗಳು ಮತ್ತು ಜಾಹೀರಾತುಗಳಿಗಾಗಿ ದಿ ಹಿಂಟ್ ಸುದ್ದಿಮನೆಯನ್ನು ತಲುಪಿ.",
};

export default function ContactPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="contact-page">
                <div className="container-editorial">
                    <nav className="page-nav">
                        <Link href="/" className="back-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            ಮುಖಪುಟಕ್ಕೆ
                        </Link>
                    </nav>

                    <header className="contact-header">
                        <h1 className="contact-title">ಸಂಪರ್ಕ</h1>
                        <hr className="contact-divider" />
                    </header>

                    <section className="contact-section">
                        <p className="contact-lead">
                            ವರದಿ ಮಾಡುವಿಕೆ, ತಿದ್ದುಪಡಿಗಳು ಮತ್ತು ಸಾಮಾನ್ಯ ವಿಚಾರಣೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ಸಂಪಾದಕೀಯ ತಂಡವು ಓದುಗರಿಂದ ಪತ್ರವ್ಯವಹಾರವನ್ನು ಸ್ವಾಗತಿಸುತ್ತದೆ. ಎಲ್ಲಾ ಸಂದೇಶಗಳನ್ನು ಸೂಕ್ತ ವಿಭಾಗದಿಂದ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ. ಸ್ವೀಕರಿಸಿದ ಸಂದೇಶಗಳ ಪ್ರಮಾಣದಿಂದಾಗಿ, ಎಲ್ಲಾ ಸಂದೇಶಗಳು ವೈಯಕ್ತಿಕ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಪಡೆಯದಿರಬಹುದು.
                        </p>
                    </section>

                    <section className="contact-section">
                        <h2 className="contact-heading">ಸಾಮಾನ್ಯ ವಿಚಾರಣೆಗಳು</h2>
                        <p className="contact-body">
                            ವರದಿ ಕುರಿತ ಪ್ರಶ್ನೆಗಳಿಗೆ, ಲೇಖನಗಳ ಮೇಲಿನ ಪ್ರತಿಕ್ರಿಯೆ ಅಥವಾ ಸುದ್ದಿಮನೆಯೊಂದಿಗೆ ಸಾಮಾನ್ಯ ವಿಚಾರಣೆಗಾಗಿ ಓದುಗರು ಕೆಳಗಿನ ವಿಳಾಸಕ್ಕೆ ಬರೆಯಬಹುದು.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:contact@thehint.news" className="email-link">
                                contact@thehint.news
                            </a>
                        </p>
                    </section>

                    <section className="contact-section">
                        <h2 className="contact-heading">ಸುದ್ದಿ ಸುಳಿವುಗಳು</h2>
                        <p className="contact-body">
                            ದಿ ಹಿಂಟ್ ಸಾರ್ವಜನಿಕ ಹಿತಾಸಕ್ತಿಯ ವಿಷಯಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ಮಾಹಿತಿಯನ್ನು ಸ್ವಾಗತಿಸುತ್ತದೆ. ತನಿಖಾ ಅಥವಾ ಸಾರ್ವಜನಿಕ-ಹಿತಾಸಕ್ತಿಯ ವರದಿಗೆ ಕೊಡುಗೆ ನೀಡಬಹುದಾದ ಸುಳಿವುಗಳನ್ನು ಸಂಪಾದಕೀಯ ತಂಡವು ಪರಿಶೀಲಿಸುತ್ತದೆ. ಸೂಕ್ತವಾದಲ್ಲಿ ಮತ್ತು ಕಾನೂನಿನ ಪ್ರಕಾರ ಅನುಮತಿಸಲ್ಪಟ್ಟಲ್ಲಿ ಗೌಪ್ಯತೆಯನ್ನು ಗೌರವಿಸಲಾಗುತ್ತದೆ.
                        </p>
                        <p className="contact-body">
                            ಸುಳಿವು ಸಲ್ಲಿಸುವಾಗ, ವಾಸ್ತವಿಕ, ಪರಿಶೀಲಿಸಬಹುದಾದ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಲು ಓದುಗರನ್ನು ಪ್ರೋತ್ಸಾಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ಸಾಧ್ಯವಾದಲ್ಲೆಲ್ಲಾ ಬೆಂಬಲಿಸುವ ದಾಖಲಾತಿಗಳನ್ನು ಒದಗಿಸಲು ವಿನಂತಿಸಲಾಗಿದೆ.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:newstips@thehint.news" className="email-link">
                                newstips@thehint.news
                            </a>
                        </p>
                    </section>

                    <section className="contact-section">
                        <h2 className="contact-heading">ಸಂಪಾದಕರಿಗೆ ಪತ್ರಗಳು</h2>
                        <p className="contact-body">
                            ಪ್ರಕಟಿತ ಲೇಖನಗಳಿಗೆ ಪ್ರತಿಕ್ರಿಯೆಯಾಗಿ ಅಥವಾ ಸಾರ್ವಜನಿಕ ಕಾಳಜಿಯ ವಿಷಯಗಳ ಕುರಿತು ಓದುಗರು ಪತ್ರಗಳನ್ನು ಸಲ್ಲಿಸಬಹುದು. ಪತ್ರಗಳು ಸಂಕ್ಷಿಪ್ತವಾಗಿರಬೇಕು ಮತ್ತು ಲೇಖಕರ ಪೂರ್ಣ ಹೆಸರನ್ನು ಒಳಗೊಂಡಿರಬೇಕು.
                        </p>
                        <p className="contact-body">
                            ಪತ್ರವನ್ನು ಸಲ್ಲಿಸುವುದರಿಂದ ಪ್ರಕಟಣೆಯ ಖಾತರಿಯಿಲ್ಲ. ಪ್ರಕಟಣೆಗಾಗಿ ಆಯ್ಕೆಮಾಡಿದ ಪತ್ರಗಳನ್ನು ಸ್ಪಷ್ಟತೆ, ಉದ್ದ ಮತ್ತು ಶೈಲಿಗಾಗಿ ಸಂಪಾದಿಸಬಹುದು. ಸಂಪಾದಕೀಯ ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸದ ಪತ್ರಗಳನ್ನು ತಿರಸ್ಕರಿಸುವ ಹಕ್ಕನ್ನು ದಿ ಹಿಂಟ್ ಕಾಯ್ದಿರಿಸಿದೆ.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:letters@thehint.news" className="email-link">
                                letters@thehint.news
                            </a>
                        </p>
                    </section>

                    <section className="contact-section">
                        <h2 className="contact-heading">ತಿದ್ದುಪಡಿಗಳು</h2>
                        <p className="contact-body">
                            ನಿಖರತೆಯು ಈ ಪ್ರಕಟಣೆಯ ಧ್ಯೇಯಕ್ಕೆ ಮೂಲಭೂತವಾಗಿದೆ. ಪ್ರಕಟವಾದ ವಿಷಯದಲ್ಲಿ ವಾಸ್ತವಿಕ ದೋಷಗಳನ್ನು ಗುರುತಿಸುವ ಓದುಗರು ಅವುಗಳನ್ನು ವರದಿ ಮಾಡಲು ಪ್ರೋತ್ಸಾಹಿಸಲಾಗುತ್ತದೆ. ಎಲ್ಲಾ ತಿದ್ದುಪಡಿ ವಿನಂತಿಗಳನ್ನು ಸಂಪಾದಕೀಯ ತಂಡವು ಪರಿಶೀಲಿಸುತ್ತದೆ ಮತ್ತು ತ್ವರಿತವಾಗಿ ಪರಿಹರಿಸುತ್ತದೆ.
                        </p>
                        <p className="contact-body">
                            ದೋಷವನ್ನು ವರದಿ ಮಾಡುವಾಗ, ದಯವಿಟ್ಟು ಲೇಖನದ ಶೀರ್ಷಿಕೆ, ಪ್ರಕಟಣೆಯ ದಿನಾಂಕ ಮತ್ತು ಸರಿಯಾದ ಮಾಹಿತಿಯೊಂದಿಗೆ ತಪ್ಪುಗಳ ವಿವರಣೆಯನ್ನು ಸೇರಿಸಿ.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:corrections@thehint.news" className="email-link">
                                corrections@thehint.news
                            </a>
                        </p>
                    </section>

                    <section className="contact-section">
                        <h2 className="contact-heading">ಜಾಹೀರಾತು ಮತ್ತು ವ್ಯಾಪಾರ</h2>
                        <p className="contact-body">
                            ವಾಣಿಜ್ಯ ಮತ್ತು ಜಾಹೀರಾತು ವಿಚಾರಣೆಗಳನ್ನು ಸಂಪಾದಕೀಯ ಕಾರ್ಯಾಚರಣೆಗಳಿಂದ ಪ್ರತ್ಯೇಕವಾಗಿ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ. ಈ ಪ್ರಕಟಣೆಯ ವ್ಯಾಪಾರ ಮತ್ತು ಸಂಪಾದಕೀಯ ಕಾರ್ಯಗಳ ನಡುವೆ ಕಟ್ಟುನಿಟ್ಟಾದ ಪ್ರತ್ಯೇಕತೆಯಿದೆ. ಜಾಹೀರಾತುಗಳು ವರದಿ ಮಾಡುವಿಕೆ ಅಥವಾ ಸಂಪಾದಕೀಯ ನಿರ್ಧಾರಗಳ ಮೇಲೆ ಪ್ರಭಾವ ಬೀರುವುದಿಲ್ಲ.
                        </p>
                        <p className="contact-email">
                            <a href="mailto:advertising@thehint.news" className="email-link">
                                advertising@thehint.news
                            </a>
                        </p>
                    </section>

                    <section className="contact-section contact-jurisdiction">
                        <p className="contact-body">
                            ಈ ಪ್ರಕಟಣೆಯು ಡಿಜಿಟಲ್ ಆಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ ಮತ್ತು ಜಾಗತಿಕ ಓದುಗರಿಗೆ ಸೇವೆ ಸಲ್ಲಿಸುತ್ತದೆ.
                        </p>
                    </section>

                    <section className="contact-section contact-closing">
                        <p className="contact-body">
                            ಎಲ್ಲಾ ಪತ್ರವ್ಯವಹಾರಗಳನ್ನು ಪ್ರಕಟಣೆಯ ಸಂಪಾದಕೀಯ ಮಾನದಂಡಗಳು ಮತ್ತು ಗೌಪ್ಯತೆ ನೀತಿಗೆ ಅನುಗುಣವಾಗಿ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ.
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
