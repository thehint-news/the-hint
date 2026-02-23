/**
 * Welcome Email — Resend
 *
 * Sends a welcome email to new subscribers using the Resend API.
 * Fire-and-forget safe — failures log silently.
 * No nodemailer, no SMTP.
 */

import { Resend } from 'resend';
import { logger } from '@/lib/feedback/console-guard';

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        logger.error('[EMAIL] RESEND_API_KEY is not configured');
        return null;
    }
    return new Resend(apiKey);
}

function getFromAddress(): string {
    const from = process.env.EMAIL_FROM;
    if (!from) {
        logger.error('[EMAIL] EMAIL_FROM is not configured');
        return 'noreply@thehint.news';
    }
    return from;
}

function getBaseUrl(): string {
    // Priority: explicit config → Vercel auto-vars → fallback
    const candidates = [
        process.env.APP_BASE_URL,
        process.env.NEXT_PUBLIC_BASE_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ];

    for (const url of candidates) {
        if (url && !url.includes('localhost')) {
            return url.replace(/\/$/, ''); // Strip trailing slash
        }
    }

    // Last resort fallback (should never be reached in production)
    logger.warn('[EMAIL] No APP_BASE_URL configured, using fallback');
    return 'https://thehint.news';
}

/**
 * Send article notification email (fire-and-forget).
 * Used by the publish route as a secondary delivery path.
 */
export async function sendArticleEmail(article: {
    headline: string;
    summary: string;
    section: string;
    publishedAt: string;
    url: string;
}): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    const baseUrl = getBaseUrl();

    // Import subscribers dynamically to avoid circular deps
    const { getActiveSubscribers } = await import('./subscription');
    const subscribers = await getActiveSubscribers();

    if (subscribers.length === 0) return;

    const subject = `THE HINT: ${article.headline}`;
    const summary = article.summary.length > 150
        ? article.summary.substring(0, 147) + '...'
        : article.summary;

    logger.info(`[EMAIL] Dispatching "${article.headline}" to ${subscribers.length} subscribers via Resend.`);

    for (const recipientEmail of subscribers) {
        try {
            await resend.emails.send({
                from: getFromAddress(),
                to: [recipientEmail],
                subject,
                html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111; background-color: #ffffff;">
                    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #111;">
                        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">THE HINT</h1>
                    </div>
                    <div style="padding: 30px 20px;">
                        <p style="text-transform: uppercase; font-size: 11px; color: #666; letter-spacing: 1px; margin: 0 0 10px 0;">
                            ${article.section} · ${new Date(article.publishedAt).toLocaleDateString()}
                        </p>
                        <h2 style="font-size: 28px; margin: 0 0 15px 0; line-height: 1.2; font-weight: bold;">${article.headline}</h2>
                        <p style="font-size: 17px; line-height: 1.6; color: #333; margin: 0 0 25px 0;">
                            ${summary}
                        </p>
                        <a href="${baseUrl}${article.url}" 
                           style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">
                            Read Full Article
                        </a>
                    </div>
                    <div style="padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #888; text-align: center;">
                        <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
                    </div>
                </div>
                `,
            });
        } catch {
            // Silent failure — never break
        }
    }
}


export async function sendWelcomeEmail(email: string): Promise<void> {
    const resend = getResendClient();
    if (!resend) {
        logger.warn('[EMAIL] Resend not configured. Skipping welcome email.');
        return;
    }

    const baseUrl = getBaseUrl();

    logger.info(`[EMAIL] Sending welcome email to: ${email}`);

    try {
        const { error } = await resend.emails.send({
            from: getFromAddress(),
            to: [email],
            subject: "You're subscribed — here's what to expect",
            html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111; background-color: #ffffff; padding: 0;">
                <!-- Header -->
                <div style="text-align: center; padding: 30px 20px; border-bottom: 1px solid #E5E5E5;">
                    <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">THE HINT</h1>
                </div>

                <div style="padding: 30px 25px;">
                    <p style="font-family: Georgia, serif; font-size: 18px; line-height: 1.6; color: #111; margin: 0 0 10px 0;">
                        Thank you for subscribing.
                    </p>
                    <p style="font-family: Georgia, serif; font-size: 18px; line-height: 1.6; color: #111; margin: 0 0 30px 0;">
                        You'll now receive important reporting, investigations, and analysis directly from our newsroom.
                    </p>

                    <!-- Editorial Mission -->
                    <div style="background-color: #F9F9F9; padding: 20px; border-left: 4px solid #111; margin-bottom: 30px;">
                        <p style="font-family: Georgia, serif; font-style: italic; font-size: 16px; line-height: 1.6; color: #333; margin: 0;">
                            "We believe journalism should be calm, factual, and independent. Our reporting focuses on what matters — not what trends — with clear separation between news and opinion."
                        </p>
                    </div>

                    <!-- What to Expect -->
                    <div style="margin-bottom: 30px; font-family: Arial, sans-serif;">
                        <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 15px;">
                            WHAT TO EXPECT
                        </p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #111; font-size: 15px;">Breaking news when it matters</td></tr>
                            <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #111; font-size: 15px;">Major stories and investigations</td></tr>
                            <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #111; font-size: 15px;">Opinion clearly labeled and separated</td></tr>
                            <tr><td style="padding: 15px 0 0 0; color: #666; font-size: 13px;">We do not send promotional emails.</td></tr>
                        </table>
                    </div>

                    <!-- Gentle Engagement -->
                    <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 1px solid #E5E5E5;">
                        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #444; margin-bottom: 10px;">
                            You can visit the homepage anytime for the latest coverage.
                        </p>
                        <a href="${baseUrl}" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111; text-decoration: none;">
                            Visit the homepage →
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="padding: 20px; text-align: center; background-color: #fafafa;">
                    <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="font-family: Arial, sans-serif; font-size: 11px; color: #666; text-decoration: underline;">Unsubscribe</a>
                </div>
            </div>
            `,
        });

        if (error) {
            logger.error(`[EMAIL] Resend error for welcome email:`, error.message);
        }
    } catch (err) {
        logger.error(`[EMAIL] Failed to send welcome email to ${email}`, err);
        // Do not throw — welcome email failure should not break subscription flow
    }
}
