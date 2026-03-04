/**
 * Privacy Policy Page
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "ಗೌಪ್ಯತೆ ನೀತಿ",
    description: "ದಿ ಹಿಂಟ್ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಸಂಗ್ರಹಿಸುತ್ತದೆ, ಬಳಸುತ್ತದೆ ಮತ್ತು ರಕ್ಷಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ತಿಳಿಯಿರಿ.",
};

export default function PrivacyPolicyPage() {
    return (
        <main id="main-content" className="flex-1">
            <article className="privacy-page">
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

                    <header className="privacy-header">
                        <h1 className="privacy-title">ಗೌಪ್ಯತೆ ನೀತಿ</h1>
                        <hr className="privacy-divider" />
                    </header>

                    <section className="privacy-section">
                        <p className="privacy-lead">
                            ದಿ ಹಿಂಟ್ ಓದುಗರ ಗೌಪ್ಯತೆಯನ್ನು ಗೌರವಿಸುತ್ತದೆ. ಓದುಗರು ಈ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿದಾಗ ಮತ್ತು ಸಂವಹನ ನಡೆಸಿದಾಗ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ, ಬಳಸಲಾಗುತ್ತದೆ ಮತ್ತು ರಕ್ಷಿಸಲಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ಈ ಗೌಪ್ಯತೆ ನೀತಿಯು ವಿವರಿಸುತ್ತದೆ.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ನಾವು ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ</h2>

                        <h3 className="privacy-subheading">ನೀವು ಒದಗಿಸುವ ಮಾಹಿತಿ</h3>
                        <p className="privacy-body">
                            ಓದುಗರು ಈ ವೆಬ್‌ಸೈಟ್‌ನೊಂದಿಗೆ ಸಂವಹನ ನಡೆಸಲು ಆಯ್ಕೆಮಾಡಿದಾಗ, ಕೆಲವು ಮಾಹಿತಿಯನ್ನು ಸ್ವಯಂಪ್ರೇರಣೆಯಿಂದ ಒದಗಿಸಬಹುದು. ಇವುಗಳು ಸೇರಿವೆ:
                        </p>
                        <ul className="privacy-list">
                            <li>ಹೊಸ ಲೇಖನಗಳ ಕುರಿತು ನವೀಕರಣಗಳನ್ನು ಪಡೆಯಲು ಚಂದಾದಾರರಾದಾಗ ಇಮೇಲ್ ವಿಳಾಸಗಳು</li>
                            <li>ಸಂಪರ್ಕ ಪುಟದ ಮೂಲಕ ಕಳುಹಿಸಲಾದ ಸಂದೇಶಗಳು ಅಥವಾ ಸುದ್ದಿ ಸುಳಿವುಗಳನ್ನು ಸಲ್ಲಿಸುವಾಗ</li>
                        </ul>
                        <p className="privacy-body">
                            ಈ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಪ್ರಕಟವಾದ ಲೇಖನಗಳನ್ನು ಓದಲು ಯಾವುದೇ ಖಾತೆ ನೋಂದಣಿ ಅಗತ್ಯವಿಲ್ಲ. ಓದುಗರು ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸದೆ ಎಲ್ಲಾ ಪ್ರಕಟಿತ ವಿಷಯವನ್ನು ಪ್ರವೇಶಿಸಬಹುದು.
                        </p>

                        <h3 className="privacy-subheading">ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ</h3>
                        <p className="privacy-body">
                            ಓದುಗರು ಈ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿದಾಗ, ಸೈಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಲು ಮತ್ತು ಸುಧಾರಿಸಲು ಸಹಾಯ ಮಾಡಲು ಸೀಮಿತ ತಾಂತ್ರಿಕ ಮಾಹಿತಿಯನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಗ್ರಹಿಸಬಹುದು. ಇವುಗಳು ಸೇರಿವೆ:
                        </p>
                        <ul className="privacy-list">
                            <li>ಬ್ರೌಸರ್ ಪ್ರಕಾರ ಮತ್ತು ಆವೃತ್ತಿ</li>
                            <li>ಸಾಧನದ ಪ್ರಕಾರ (Device type)</li>
                            <li>ಭೇಟಿಯ ಸಮಯದಲ್ಲಿ ವೀಕ್ಷಿಸಿದ ಪುಟಗಳು</li>
                            <li>ಅಂದಾಜು ಭೌಗೋಳಿಕ ಸ್ಥಳ</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಬಳಸಲಾಗುತ್ತದೆ</h2>
                        <p className="privacy-body">
                            ಈ ವೆಬ್‌ಸೈಟ್ ಮೂಲಕ ಸಂಗ್ರಹಿಸಲಾದ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಈ ಕೆಳಗಿನ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಬಳಸಲಾಗುತ್ತದೆ:
                        </p>
                        <ul className="privacy-list">
                            <li>ಹೊಸ ಲೇಖನಗಳನ್ನು ಪ್ರಕಟಿಸಿದಾಗ ಇಮೇಲ್ ಅಪ್‌ಡೇಟ್ಗಳನ್ನು ತಲುಪಿಸಲು</li>
                            <li>ಓದುಗರ ವಿಚಾರಣೆಗಳು ಮತ್ತು ಸಂದೇಶಗಳಿಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಲು</li>
                            <li>ಓದುಗರ ಆಸಕ್ತಿಗಳು ಮತ್ತು ಓದುವ ಹವ್ಯಾಸಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು</li>
                            <li>ವೆಬ್‌ಸೈಟ್‌ನ ಕಾರ್ಯಕ್ಷಮತೆ ಮತ್ತು ಉಪಯುಕ್ತತೆಯನ್ನು ಸುಧಾರಿಸಲು</li>
                        </ul>
                        <p className="privacy-body privacy-emphasis">
                            ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಮೂರನೇ ವ್ಯಕ್ತಿಗಳಿಗೆ ಮಾರಾಟ ಮಾಡಲಾಗುವುದಿಲ್ಲ. ಓದುಗರ ಡೇಟಾವನ್ನು ಜಾಹೀರಾತು ಪ್ರೊಫೈಲಿಂಗ್ ಅಥವಾ ಉದ್ದೇಶಿತ ಮಾರ್ಕೆಟಿಂಗ್ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಬಳಸಲಾಗುವುದಿಲ್ಲ.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ಇಮೇಲ್ ಸಂವಹನಗಳು</h2>
                        <p className="privacy-body">
                            ಇಮೇಲ್ ನವೀಕರಣಗಳನ್ನು ಸ್ವೀಕರಿಸಲು ಸ್ಪಷ್ಟವಾಗಿ ಆಯ್ಕೆ ಮಾಡಿದ ಓದುಗರಿಗೆ ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.
                        </p>
                        <p className="privacy-body">
                            ಪ್ರತಿ ಇಮೇಲ್ ಅನ್‌ಸಬ್‌ಸ್ಕ್ರೈಬ್ (Unsubscribe) ಮಾಡುವ ಆಯ್ಕೆಯನ್ನು ಒಳಗೊಂಡಿರುತ್ತದೆ. ಈ ವಿನಂತಿಗಳನ್ನು ತ್ವರಿತವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತದೆ, ಮತ್ತು ಅಂತಹ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಿದ ನಂತರ ಬೇರೆ ಯಾವುದೇ ಇಮೇಲ್ ಗಳನ್ನು ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ಕುಕೀಸ್ ಮತ್ತು ಅನಾಲಿಟಿಕ್ಸ್</h2>
                        <p className="privacy-body">
                            ಸರಿಯಾದ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು ಮತ್ತು ಓದುಗರ ಬಗ್ಗೆ ಮೂಲಭೂತ ಅನಾಲಿಟಿಕ್ಸ್ ಸಂಗ್ರಹಿಸಲು ಈ ವೆಬ್‌ಸೈಟ್ ಸೀಮಿತ ಸಂಖ್ಯೆಯ ಕುಕೀಗಳನ್ನು ಬಳಸುತ್ತದೆ.
                        </p>
                        <p className="privacy-body">
                            ಈ ವೆಬ್‌ಸೈಟ್ ಕ್ರಾಸ್-ಸೈಟ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಕುಕೀಗಳನ್ನು ಬಳಸುವುದಿಲ್ಲ. ಯಾವುದೇ ಜಾಹೀರಾತು ಕುಕೀಗಳನ್ನು ಬಳಸಲಾಗುವುದಿಲ್ಲ. ಓದುಗರು ತಮ್ಮ ಬ್ರೌಸರ್ ಆದ್ಯತೆಗಳ ಮೂಲಕ ಕುಕೀ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ನಿಯಂತ್ರಿಸಬಹುದು.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ಡೇಟಾ ಹಂಚಿಕೆ</h2>
                        <p className="privacy-body">
                            ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಮಾರ್ಕೆಟಿಂಗ್ ಅಥವಾ ವಾಣಿಜ್ಯ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮೂರನೇ ವ್ಯಕ್ತಿಗಳೊಂದಿಗೆ ಮಾರಾಟ ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ. ಕೆಳಗಿನ ಸೀಮಿತ ಸಂದರ್ಭಗಳಲ್ಲಿ ಮಾತ್ರ ಮಾಹಿತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಬಹುದು:
                        </p>
                        <ul className="privacy-list">
                            <li>ವೆಬ್‌ಸೈಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಲು ಸಹಾಯ ಮಾಡುವ ಸೇವಾ ಪೂರೈಕೆದಾರರೊಂದಿಗೆ (ಉದಾಹರಣೆಗೆ ಇಮೇಲ್ ವಿತರಣಾ ಸೇವೆಗಳು).</li>
                            <li>ಕಾನೂನುಬದ್ಧವಾಗಿ ಅಧಿಕೃತ ಅಧಿಕಾರಿಗಳಿಂದ ವಿನಂತಿಸಿಕೊಂಡಾಗ ಮಾತ್ರ.</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ಡೇಟಾ ಭದ್ರತೆ</h2>
                        <p className="privacy-body">
                            ಅನಧಿಕೃತ ಪ್ರವೇಶ, ಬದಲಾವಣೆ, ಅಥವಾ ನಾಶದಿಂದ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ರಕ್ಷಿಸಲು ಸಮಂಜಸವಾದ ತಾಂತ್ರಿಕ ಮತ್ತು ಸಾಂಸ್ಥಿಕ ಕ್ರಮಗಳನ್ನು ಬಳಸಲಾಗುತ್ತದೆ. ಆದಾಗ್ಯೂ, ಸಂಪೂರ್ಣ ಭದ್ರತೆಯ ಖಾತರಿಯನ್ನು ನೀಡಲಾಗುವುದಿಲ್ಲ.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2 className="privacy-heading">ನಿಮ್ಮ ಹಕ್ಕುಗಳು</h2>
                        <p className="privacy-body">
                            ಓದುಗರು ತಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ಕೆಲವು ಹಕ್ಕುಗಳನ್ನು ಹೊಂದಿದ್ದಾರೆ:
                        </p>
                        <ul className="privacy-list">
                            <li>ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಇಮೇಲ್ ಸಂವಹನಗಳಿಂದ ಅನ್‌ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಮಾಡುವ ಹಕ್ಕು</li>
                            <li>ಪ್ರಕಟಣೆಯು ಹೊಂದಿರುವ ವೈಯಕ್ತಿಕ ಡೇಟಾವನ್ನು ಅಳಿಸಲು ವಿನಂತಿಸುವ ಹಕ್ಕು</li>
                        </ul>
                        <p className="privacy-body">
                            ಈ ಹಕ್ಕುಗಳನ್ನು ಚಲಾಯಿಸಲು ದಯವಿಟ್ಟು <Link href="/contact" className="privacy-link">ಸಂಪರ್ಕ ಪುಟವನ್ನು</Link> ಬಳಸಿ.
                        </p>
                    </section>

                    <section className="privacy-section privacy-closing">
                        <p className="privacy-body">
                            ಈ ನೀತಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳನ್ನು <Link href="/contact" className="privacy-link">ಸಂಪರ್ಕ ಪುಟದ</Link> ಮೂಲಕ ಕೇಳಬಹುದು.
                        </p>
                    </section>
                </div>
            </article>
        </main>
    );
}
