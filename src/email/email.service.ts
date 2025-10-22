import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    // For development, use Ethereal Email (fake SMTP service)
    // For production, use your actual SMTP service (Gmail, SendGrid, etc.)
    
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');
    
    if (process.env.NODE_ENV === 'production' && smtpHost && smtpUser && smtpPass) {
      // Production SMTP configuration (only if credentials are provided)
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: this.configService.get('SMTP_PORT', 465),
          secure: true, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.logger.log('Production SMTP transporter configured');
      } catch (error) {
        this.logger.error('Failed to create production SMTP transporter:', error);
        this.createFallbackTransporter();
      }
    } else {
      // Development or missing SMTP config: Use console logging as fallback
      this.logger.warn('SMTP credentials not configured. Emails will be logged to console.');
      this.createFallbackTransporter();
    }
  }

  private createFallbackTransporter() {
    // Create a dummy transporter that logs emails instead of sending them
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: this.configService.get('FROM_EMAIL', 'noreply@housemajor.com'),
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

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.log(`Preview URL: ${previewUrl}`);
        }
      }
      
      // If using fallback transporter, log the email content
      if (info.message) {
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
}
