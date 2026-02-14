import nodemailer from 'nodemailer';
import { getActiveSubscribers } from './subscription';
import { logger } from '@/lib/feedback/console-guard';


// Create reusable transporter using Gmail SMTP
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

interface ArticleEmailData {
    headline: string;
    summary: string;
    section: string;
    publishedAt: string;
    url: string;
}

export async function sendArticleEmail(article: ArticleEmailData): Promise<void> {
    const subscribers = await getActiveSubscribers();

    if (subscribers.length === 0) {
        return;
    }

    const subject = `THE HINT: ${article.headline}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';

    logger.info(`[EMAIL-SYSTEM] Preparing to dispatch "${article.headline}" to ${subscribers.length} subscribers.`);

    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    // Send to each subscriber with personalized unsubscribe link
    for (const recipientEmail of subscribers) {
        const htmlContent = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111; background-color: #ffffff;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #111;">
                <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">THE HINT</h1>
            </div>
            <div style="padding: 30px 20px;">
                <p style="text-transform: uppercase; font-size: 11px; color: #666; letter-spacing: 1px; margin: 0 0 10px 0;">
                    ${article.section} • ${new Date(article.publishedAt).toLocaleDateString()}
                </p>
                <h2 style="font-size: 28px; margin: 0 0 15px 0; line-height: 1.2; font-weight: bold;">${article.headline}</h2>
                <p style="font-size: 17px; line-height: 1.6; color: #333; margin: 0 0 25px 0;">
                    ${article.summary}
                </p>
                <a href="${baseUrl}${article.url}" 
                   style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">
                    Read Full Article
                </a>
            </div>
            <div style="padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #888; text-align: center;">
                <a href="${baseUrl}/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
            </div>
        </div>
    `;

        try {
            await transporter.sendMail({
                from: fromAddress,
                to: recipientEmail,
                subject: subject,
                html: htmlContent,
            });
            logger.debug(`[EMAIL-SYSTEM] ✓ Sent article email to ${recipientEmail}`);
        } catch (error) {
            logger.error(`[EMAIL-SYSTEM] ✗ Failed to send to ${recipientEmail}`, error);
        }
    }

    logger.info(`[EMAIL-SYSTEM] Successfully dispatched article to ${subscribers.length} recipients. Logged activity.`);
}


export async function sendWelcomeEmail(email: string): Promise<void> {
    const subject = "You're subscribed — here's what to expect";

    const htmlContent = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111; background-color: #ffffff; padding: 0;">
            <!-- Header -->
            <div style="text-align: center; padding: 30px 20px; border-bottom: 1px solid #E5E5E5;">
                <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">THE HINT</h1>
            </div>

            <div style="padding: 30px 25px;">
                <!-- Opening Line -->
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
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111; text-decoration: none;">
                        Visit the homepage →
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 20px; text-align: center; background-color: #fafafa;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/unsubscribe?email=${encodeURIComponent(email)}" style="font-family: Arial, sans-serif; font-size: 11px; color: #666; text-decoration: underline;">Unsubscribe</a>
            </div>
        </div>
    `;

    logger.info(`[EMAIL-SYSTEM] Preparing to send Welcome Email to: ${email}`);

    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: subject,
            html: htmlContent,
        });
        logger.debug(`[EMAIL-SYSTEM] ✓ Welcome email sent successfully to ${email}`);
    } catch (error) {
        logger.error(`[EMAIL-SYSTEM] ✗ Failed to send welcome email to ${email}`, error);
        throw error;
    }
}
