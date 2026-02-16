/**
 * Magic Link Email — Resend
 *
 * Sends authentication magic link emails using the Resend API.
 * No nodemailer, no SMTP.
 */

import { Resend } from 'resend';

export async function sendMagicLinkEmail(email: string, token: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'The Hint <noreply@thehint.news>';
    // Use configured URL or default to localhost for local testing
    const appUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

    // Check if we are in a "real" production deployment (Vercel)
    const isDeployed = !!process.env.VERCEL;
    // Allow dev behavior if we are not deployed (e.g. npm start locally)
    const allowDevFallback = process.env.NODE_ENV !== 'production' || !isDeployed;

    if (!apiKey) {
        // In dev or local production, log the link so login is still possible
        if (allowDevFallback) {
            console.log(`[LOCAL-PROD] Magic Link (No API Key): ${appUrl}/api/auth/verify?token=${token}`);
            return;
        }
        throw new Error('RESEND_API_KEY is not configured. Cannot send magic link in production.');
    }

    const resend = new Resend(apiKey);
    const link = `${appUrl}/api/auth/verify?token=${token}`;

    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to The Hint</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Georgia', 'Times New Roman', serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 24px 40px; border-bottom: 3px solid #1a1a1a; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.1em; color: #1a1a1a; font-family: 'Georgia', serif;">
                                THE HINT
                            </h1>
                            <p style="margin: 8px 0 0 0; font-size: 11px; letter-spacing: 0.15em; color: #666666; text-transform: uppercase;">
                                Editorial Console
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 400; color: #1a1a1a; font-family: 'Georgia', serif;">
                                Ready to publish?
                            </h2>
                            <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Click the button below to access your newsroom. This secure link expires in 3 minutes.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding: 8px 0 32px 0;">
                                        <a href="${link}" 
                                           style="display: inline-block; 
                                                  padding: 16px 48px; 
                                                  background-color: #1a1a1a; 
                                                  color: #ffffff; 
                                                  text-decoration: none; 
                                                  font-size: 14px;
                                                  font-weight: 600;
                                                  letter-spacing: 0.05em;
                                                  text-transform: uppercase;
                                                  font-family: system-ui, -apple-system, sans-serif;">
                                            Enter Newsroom →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e8e8e8;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #888888; line-height: 1.5;">
                                Didn't request this? You can safely ignore this email.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #aaaaaa;">
                                This is an automated message from The Hint. Please do not reply.
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Brand footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto;">
                    <tr>
                        <td style="padding: 24px 20px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #999999;">
                                © ${new Date().getFullYear()} The Hint · Independent Journalism
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: [email],
            subject: 'Your Newsroom Access – The Hint',
            html: htmlTemplate,
        });

        if (error) {
            console.error('[AUTH-EMAIL] Resend returned error:', JSON.stringify(error, null, 2));
            // In local production/dev, fallback log instead of failing request
            if (allowDevFallback) {
                console.log(`[LOCAL-PROD-FALLBACK] Resend API Failed. Magic Link: ${link}`);
                return;
            }
            throw new Error(`Resend Error: ${error.message || 'Unknown error'}`);
        }

        console.log(`[AUTH-EMAIL] Email sent successfully. ID: ${data?.id}`);
    } catch (e: any) {
        console.error('[AUTH-EMAIL] Exception during email send:', e);
        // Fallback log for local dev/prod if actual send fails
        if (allowDevFallback) {
            console.log(`[LOCAL-PROD-FALLBACK] Magic Link (Send Failed): ${link}`);
            return;
        }
        // Re-throw with more detail if possible
        throw new Error(`Failed to send magic link email: ${e.message}`);
    }
}
