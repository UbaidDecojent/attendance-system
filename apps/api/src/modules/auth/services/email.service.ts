import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { WinstonLoggerService } from '../../../common/services/logger.service';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService,
  ) {
    const apiKey = configService.get<string>('RESEND_API_KEY');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured - emails will not be sent', 'EmailService');
    }

    this.fromEmail = configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
    this.frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    this.logger.log(`Email service initialized${apiKey ? ' with Resend' : ' (MOCKED)'} (from: ${this.fromEmail})`, 'EmailService');
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          h2 { color: #1a1a2e; margin-top: 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .link { color: #4F46E5; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <h1>📊 AttendancePro</h1>
            </div>
            <h2>Welcome, ${firstName}!</h2>
            <p>Thank you for registering with AttendancePro. Please verify your email address to activate your account and start managing attendance like a pro.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p class="link" style="font-size: 12px;">${verificationUrl}</p>
            <p style="font-size: 14px; color: #6b7280;">This link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AttendancePro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Verify Your Email - AttendancePro', html);
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          h2 { color: #1a1a2e; margin-top: 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <h1>📊 AttendancePro</h1>
            </div>
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email or contact support if you have concerns.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AttendancePro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Reset Your Password - AttendancePro', html);
  }

  async sendWelcomeEmail(email: string, firstName: string, companyName: string) {
    const loginUrl = `${this.frontendUrl}/auth/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AttendancePro</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          h2 { color: #1a1a2e; margin-top: 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .feature { display: flex; align-items: flex-start; margin: 16px 0; }
          .feature-icon { font-size: 24px; margin-right: 12px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <h1>📊 AttendancePro</h1>
            </div>
            <h2>Welcome to ${companyName}!</h2>
            <p>Hi ${firstName},</p>
            <p>Your account has been created at ${companyName}. Here's what you can do:</p>
            <div class="feature">
              <span class="feature-icon">⏰</span>
              <div><strong>Check In/Out</strong> - Record your daily attendance with ease</div>
            </div>
            <div class="feature">
              <span class="feature-icon">📅</span>
              <div><strong>Leave Management</strong> - Request time off and track your balance</div>
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <div><strong>View Reports</strong> - Access your attendance history and analytics</div>
            </div>
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to Your Account</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AttendancePro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Welcome to ${companyName} - AttendancePro`, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`, 'EmailService');
      return { id: 'mock-id' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`, JSON.stringify(error), 'EmailService');
        throw new Error(error.message);
      }

      this.logger.log(`Email sent to ${to}: ${subject} (ID: ${data?.id})`, 'EmailService');
      return data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error instanceof Error ? error.stack : String(error), 'EmailService');
      throw error;
    }
  }
}
