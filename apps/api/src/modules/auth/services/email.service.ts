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

  // ... (methods remain the same until sendEmail) ...

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
