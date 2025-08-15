import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BullMQService, JobData } from './messaging/bullmq.service';
import * as nodemailer from 'nodemailer';
import { Job } from 'bullmq';
import { FeatureFlagsService } from './feature-flags.service';

export interface EmailJobData extends JobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class EmailingService implements OnModuleInit {
  private readonly logger = new Logger(EmailingService.name);
  private transporter: nodemailer.Transporter;
  private isEnabled = false;

  constructor(
    private readonly bullMQService: BullMQService,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  async onModuleInit() {
    this.isEnabled = this.featureFlags.isEmailServiceEnabled;

    if (!this.isEnabled) {
      this.logger.log('Email service is disabled by feature flag');
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Email service disabled in test environment');
      return;
    }

    // Initialize SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection failed:', error.message);
    }

    // Create email queue with processor
    this.bullMQService.createQueue({
      name: 'email',
      processor: this.processEmailJob.bind(this),
    });
  }

  private async processEmailJob(job: Job<EmailJobData>): Promise<void> {
    if (!this.isEnabled) return;

    const { to, subject, body, html } = job.data;
    this.logger.log(`Processing email job ${job.id} for ${to}`);

    try {
      await this.sendEmail({ to, subject, body, html });
      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error.message);
      throw error; // Re-throw to mark job as failed
    }
  }

  async sendEmail(emailData: EmailJobData): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Email service is disabled - email not sent');
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      this.logger.log(`[TEST] Email would be sent to: ${emailData.to} - ${emailData.subject}`);
      return;
    }

    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.body,
      html: emailData.html || emailData.body,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent successfully: ${info.messageId}`);
  }

  async queueEmail(emailData: EmailJobData, delay?: number): Promise<any> {
    if (!this.isEnabled) {
      this.logger.log('Email service is disabled - email not queued');
      return null;
    }

    const options = delay ? { delay } : {};
    return this.bullMQService.addJob('email', 'send-email', emailData, options);
  }

  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<void> {
    if (!this.isEnabled) return;

    await this.queueEmail({
      to: userEmail,
      subject: 'Welcome!',
      body: `Hello ${userName || 'there'}! Welcome to our application.`,
      html: `<h1>Welcome ${userName || 'there'}!</h1><p>Thank you for joining our application.</p>`,
    });
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    if (!this.isEnabled) return;

    await this.queueEmail({
      to: userEmail,
      subject: 'Password Reset Request',
      body: `Password reset token: ${resetToken}`,
      html: `<p>Your password reset token is: <strong>${resetToken}</strong></p>`,
    });
  }

  async sendImmediateEmail(emailData: EmailJobData): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Email service is disabled - immediate email not sent');
      return;
    }

    // Send email immediately without queueing
    await this.sendEmail(emailData);
  }

  async getEmailQueueStats(): Promise<any> {
    if (!this.isEnabled) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    try {
      return await this.bullMQService.getQueueStats('email');
    } catch (error) {
      this.logger.error('Failed to get email queue stats:', error.message);
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
  }
}
