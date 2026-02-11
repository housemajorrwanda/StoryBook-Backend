import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | undefined;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (
      process.env.NODE_ENV === 'production' &&
      smtpHost &&
      smtpUser &&
      smtpPass
    ) {
      // Production SMTP configuration (only if credentials are provided)
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: this.configService.get<number>('SMTP_PORT', 465),
          secure: true,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.logger.log('Production SMTP transporter configured');
      } catch (error) {
        this.logger.error(
          'Failed to create production SMTP transporter:',
          error,
        );
        this.createFallbackTransporter();
      }
    } else {
      // Development or missing SMTP config: Use console logging as fallback
      this.logger.warn(
        'SMTP credentials not configured. Emails will be logged to console.',
      );
      this.createFallbackTransporter();
    }
  }

  private createFallbackTransporter() {
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>(
        'FROM_EMAIL',
        'noreply@housemajor.com',
      ),
      to: email,
      subject: 'Password Reset Request - StoryBook',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your StoryBook account. Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you didn't request this password reset, please ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from StoryBook. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      if (!this.transporter) {
        this.logger.error('Email transporter not initialized');
        // Log email instead of failing
        this.logger.log(`[EMAIL] Password reset email for: ${email}`);
        this.logger.log(`[EMAIL] Reset URL: ${resetUrl}`);
        return;
      }

      const info = (await this.transporter.sendMail(
        mailOptions,
      )) as unknown as Record<string, unknown>;

      if (process.env.NODE_ENV !== 'production') {
        try {
          const previewUrl = nodemailer.getTestMessageUrl(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            info as unknown as nodemailer.SentMessageInfo,
          );
          if (previewUrl) {
            this.logger.log(`Preview URL: ${previewUrl}`);
          }
        } catch (error) {
          // Ignore preview URL errors in development
          this.logger.debug('Could not generate preview URL:', error);
        }
      }

      // If using fallback transporter, log the email content
      if (info && typeof info === 'object' && 'message' in info) {
        this.logger.log(`[EMAIL] Password reset email for: ${email}`);
        this.logger.log(`[EMAIL] Reset URL: ${resetUrl}`);
      } else {
        this.logger.log(`Password reset email sent to: ${email}`);
      }
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
      // Don't throw error - just log it so the app doesn't crash
      this.logger.log(`[EMAIL FALLBACK] Password reset email for: ${email}`);
      this.logger.log(`[EMAIL FALLBACK] Reset URL: ${resetUrl}`);
    }
  }

  async sendTestimonyStatusEmail(params: {
    to: string;
    status: 'approved' | 'rejected' | 'pending';
    feedback?: string;
    testimonyTitle?: string;
    testimonyId: number;
  }): Promise<void> {
    const { to, status, feedback, testimonyTitle, testimonyId } = params;
    const appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const testimonyUrl = `${appUrl}/testimonies/${testimonyId}`;

    const subject =
      status === 'approved'
        ? 'Your testimony was approved'
        : status === 'rejected'
          ? 'Your testimony was rejected'
          : 'Your testimony status was updated';

    const feedbackHtml =
      feedback && feedback.trim().length
        ? `<p><strong>Feedback:</strong> ${feedback}</p>`
        : '';

    const titleHtml = testimonyTitle
      ? `<h3 style="margin-top:0;">${testimonyTitle}</h3>`
      : '';

    const actionHtml =
      status === 'approved'
        ? `<a href="${testimonyUrl}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">View your testimony</a>`
        : `<a href="${testimonyUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Review details</a>`;

    const html = `
      <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h2 style="color:#111">Testimony status update</h2>
        ${titleHtml}
        <p>Your testimony status is now: <strong>${status}</strong>.</p>
        ${feedbackHtml}
        <div style="margin:24px 0;">${actionHtml}</div>
        <p style="color:#555;font-size:12px;">If the button doesn't work, copy this link: ${testimonyUrl}</p>
      </div>
    `;

    const mailOptions = {
      from: this.configService.get<string>(
        'FROM_EMAIL',
        'noreply@housemajor.com',
      ),
      to,
      subject,
      html,
    };

    try {
      if (!this.transporter) {
        this.logger.log(
          `[EMAIL] Status: ${status} to ${to} for testimony ${testimonyId}`,
        );
        return;
      }
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Status email (${status}) sent to: ${to}`);
    } catch (error) {
      this.logger.error('Failed to send status email:', error);
      this.logger.log(
        `[EMAIL FALLBACK] Status: ${status} to ${to} for testimony ${testimonyId}`,
      );
    }
  }

  async sendDraftReminderEmail(params: {
    to: string;
    userName?: string;
    testimonyTitle: string;
    testimonyId: number;
    daysSinceLastSaved: number;
  }): Promise<void> {
    const { to, userName, testimonyTitle, testimonyId, daysSinceLastSaved } =
      params;
    const appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const draftUrl = `${appUrl}/testimonies/${testimonyId}/edit`;
    const greeting = userName ? `Hello ${userName},` : 'Hello,';
    const daysText =
      daysSinceLastSaved === 7
        ? 'a week'
        : daysSinceLastSaved === 14
          ? 'two weeks'
          : `${daysSinceLastSaved} days`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Continue Your Story</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; line-height: 1.3;">
                      ✨ Continue Your Story
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 500;">
                      ${greeting}
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.7;">
                      We noticed you started writing your testimony <strong style="color: #333333;">"${testimonyTitle}"</strong> ${daysText} ago, but haven't finished it yet.
                    </p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #555555; font-size: 16px; line-height: 1.7; font-style: italic;">
                        "Your story is important and deserves to be shared. Every testimony helps preserve history and honor those who experienced it."
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 35px 0;">
                      <tr>
                        <td align="center" style="padding: 0;">
                          <a href="${draftUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                            Continue Writing →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0; color: #555555; font-size: 16px; line-height: 1.7;">
                      Don't worry if you're not sure what to write next. Just start with what you remember, and you can always come back to add more details.
                    </p>
                    
                    <p style="margin: 20px 0 0 0; color: #555555; font-size: 16px; line-height: 1.7;">
                      If you have any questions or need help, we're here to support you.
                    </p>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 30px;">
                    <hr style="margin: 0; border: none; border-top: 1px solid #e5e5e5;">
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #fafafa; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 15px 0; color: #888888; font-size: 13px; line-height: 1.6;">
                      <strong style="color: #666666;">Can't click the button?</strong><br>
                      Copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 20px 0; word-break: break-all;">
                      <a href="${draftUrl}" style="color: #667eea; text-decoration: none; font-size: 13px; font-family: monospace;">${draftUrl}</a>
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                      This is an automated reminder from <strong style="color: #666666;">StoryBook</strong>. We'll send you a gentle reminder every week until you continue your testimony.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Email Footer -->
              <table role="presentation" style="max-width: 600px; width: 100%; margin-top: 20px;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} StoryBook. All rights reserved.
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

    const mailOptions = {
      from: this.configService.get<string>(
        'FROM_EMAIL',
        'noreply@housemajor.com',
      ),
      to,
      subject: `Continue your story: "${testimonyTitle}"`,
      html,
    };

    try {
      if (!this.transporter) {
        this.logger.log(
          `[EMAIL] Draft reminder to ${to} for testimony "${testimonyTitle}" (${testimonyId})`,
        );
        return;
      }
      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Draft reminder email sent to: ${to} for testimony "${testimonyTitle}"`,
      );
    } catch (error) {
      this.logger.error('Failed to send draft reminder email:', error);
      this.logger.log(
        `[EMAIL FALLBACK] Draft reminder to ${to} for testimony "${testimonyTitle}" (${testimonyId})`,
      );
    }
  }
}
