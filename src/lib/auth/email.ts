
import nodemailer from 'nodemailer';

export async function sendMagicLinkEmail(email: string, token: string) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const expiryMinutes = process.env.MAGIC_LINK_EXPIRY_MINUTES || 30;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
        console.error('Missing SMTP configuration');
        // In dev, maybe log the link?
        console.log(`[DEV] Magic Link: ${appUrl}/api/auth/verify?token=${token}`);

        if (process.env.NODE_ENV === 'production') {
            throw new Error('SMTP configuration missing in production');
        }
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    const link = `${appUrl}/api/auth/verify?token=${token}`;

    // Professional email template
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

    const textTemplate = `
THE HINT - Editorial Console

Ready to publish?

Click the link below to access your newsroom. This secure link expires in ${expiryMinutes} minutes.

${link}

----
Didn't request this? You can safely ignore this email.

© ${new Date().getFullYear()} The Hint · Independent Journalism
    `.trim();

    try {
        await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: 'Your Newsroom Access – The Hint',
            text: textTemplate,
            html: htmlTemplate,
        });
    } catch (error) {
        console.error('Failed to send email:', error);
        // Fallback log for debugging if email fails (crucial for setup verification)
        console.log(`[FALLBACK ALERT] Email failed. Magic Link: ${link}`);
        throw new Error('Failed to send magic link email');
    }
}
