import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BullMQService, JobData } from './messaging/bullmq.service';
import * as nodemailer from 'nodemailer';
import { Job } from 'bullmq';

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

  constructor(private readonly bullMQService: BullMQService) {}

  async onModuleInit() {
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
    const { to, subject, body, html } = job.data;

    this.logger.log(
      `Processing email job ${job.id} for recipient: ${to.replace(/(.{3}).*@/, '$1***@')}`
    );

    try {
      await this.sendEmail({ to, subject, body, html });
      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error.message);
      throw error; // Re-throw to mark job as failed
    }
  }

  async sendEmail(emailData: EmailJobData): Promise<void> {
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
    return this.bullMQService.addJob('email', 'send-email', emailData, { delay });
  }

  async sendImmediateEmail(emailData: EmailJobData): Promise<void> {
    return this.sendEmail(emailData);
  }

  async getEmailQueueStats() {
    return this.bullMQService.getQueueStats('email');
  }
}
