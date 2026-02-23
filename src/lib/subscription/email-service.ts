/**
 * Email Service — Resend
 *
 * Sends article notification emails using the Resend API (free tier).
 *
 * RULES:
 * - Email sending MUST NOT block publishing
 * - Fire-and-forget pattern: log silently on failure
 * - No nodemailer, no SMTP
 * - Summary limited to 150 chars max
 * - CTA links to full article URL
 */

import { Resend } from 'resend';
import { SubscriptionEvent } from './types';
import { logger } from '@/lib/feedback/console-guard';

// =============================================================================
// CLIENT
// =============================================================================

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        logger.error('[EMAIL] RESEND_API_KEY not configured. Email delivery disabled.');
        return null;
    }
    return new Resend(apiKey);
}

function getFromAddress(): string {
    const from = process.env.EMAIL_FROM;
    if (!from) {
        logger.error('[EMAIL] EMAIL_FROM not configured. Using fallback.');
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
            return url.replace(/\/$/, '');
        }
    }
    logger.warn('[EMAIL] No APP_BASE_URL configured, using fallback');
    return 'https://thehint.news';
}

// =============================================================================
// EMAIL TEMPLATE
// =============================================================================

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getIntroText(contentType: string, section: string): string {
    if (contentType === 'opinion') {
        return 'You might find this perspective interesting.';
    }

    const sectionIntros: Record<string, string> = {
        'politics': "Here's something you should know about.",
        'world-affairs': 'This story caught our attention today.',
        'crime': 'We wanted to bring this to you.',
        'court': "Here's what's happening in the courts.",
    };

    return sectionIntros[section] || "You have to see this.";
}

/** Truncate summary to 150 chars max */
function truncateSummary(text: string): string {
    if (text.length <= 150) return text;
    return text.substring(0, 147) + '...';
}

function generateHtml(event: SubscriptionEvent, recipientEmail: string): string {
    const { headline, summary, section, contentType, createdAt, articleSlug } = event;

    const greeting = getGreeting();
    const introText = getIntroText(contentType, section);
    const truncatedSummary = truncateSummary(summary);

    const publishedDate = new Date(createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const baseUrl = getBaseUrl();
    const fullArticleUrl = `${baseUrl}/${section}/${articleSlug}`;

    const opinionBadge = contentType === 'opinion'
        ? `<span style="display: inline-block; background-color: #7C3AED; color: white; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; margin-bottom: 15px;">Opinion</span><br>`
        : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F7F4; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F4;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px;">
                    
                    <!-- Masthead -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 30px;">
                            <h1 style="font-family: Georgia, serif; font-size: 36px; font-weight: 900; letter-spacing: -1px; margin: 0; color: #1a1a1a;">THE HINT</h1>
                            <p style="font-family: Arial, sans-serif; font-size: 11px; color: #888; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">${publishedDate}</p>
                        </td>
                    </tr>

                    <!-- Main Card -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                
                                <!-- Greeting & Intro -->
                                <tr>
                                    <td style="padding: 35px 40px 0 40px;">
                                        <p style="font-family: Georgia, serif; font-size: 18px; color: #333; margin: 0 0 5px 0;">
                                            ${greeting},
                                        </p>
                                        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 25px 0;">
                                            ${introText}
                                        </p>
                                    </td>
                                </tr>

                                <!-- Article Content -->
                                <tr>
                                    <td style="padding: 0 40px;">
                                        <div style="width: 50px; height: 3px; background-color: #1a1a1a; margin-bottom: 20px;"></div>
                                        
                                        ${opinionBadge}
                                        
                                        <h2 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; line-height: 1.3; color: #1a1a1a; margin: 0 0 18px 0;">
                                            ${headline}
                                        </h2>
                                        
                                        <p style="font-family: Georgia, serif; font-size: 17px; line-height: 1.7; color: #444; margin: 0 0 8px 0;">
                                            ${truncatedSummary}
                                        </p>
                                        
                                        <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                                            ${section}
                                        </p>
                                    </td>
                                </tr>

                                <!-- CTA -->
                                <tr>
                                    <td style="padding: 30px 40px 35px 40px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td>
                                                    <a href="${fullArticleUrl}" 
                                                       style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; border-radius: 2px;">
                                                        Continue reading →
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0; text-align: center;">
                            <p style="font-family: Arial, sans-serif; font-size: 13px; color: #666; margin: 0 0 15px 0;">
                                Thank you for being a reader.
                            </p>
                            <a href="${baseUrl}" style="font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; text-decoration: none; font-weight: 600;">
                                Visit The Hint →
                            </a>
                            <p style="margin: 20px 0 0 0;">
                                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="font-family: Arial, sans-serif; font-size: 11px; color: #999; text-decoration: underline;">Unsubscribe</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

// =============================================================================
// SUBJECT LINE
// =============================================================================

function generateSubject(event: SubscriptionEvent): string {
    const { headline, contentType } = event;

    if (contentType === 'opinion') {
        return `Opinion: ${headline}`;
    }

    // Rotate between patterns for variety
    const patterns = [
        headline,
        `Just in: ${headline}`,
    ];

    return patterns[headline.length % 2];
}

// =============================================================================
// SEND
// =============================================================================

/**
 * Send a single email safely using Resend API.
 * Returns true if successful, false otherwise.
 * MUST NOT throw errors — fire-and-forget safe.
 */
export async function sendEmailForEvent(recipient: string, event: SubscriptionEvent): Promise<boolean> {
    try {
        const resend = getResendClient();
        if (!resend) return false;

        const subject = generateSubject(event);
        const html = generateHtml(event, recipient);

        const { error } = await resend.emails.send({
            from: getFromAddress(),
            to: [recipient],
            subject,
            html,
        });

        if (error) {
            logger.error(`[EMAIL] Resend error for ${recipient}:`, error.message);
            return false;
        }

        return true;
    } catch (error) {
        logger.error('[EMAIL] Fatal caught error:', error);
        // Silent failure — never break publishing
        return false;
    }
}
