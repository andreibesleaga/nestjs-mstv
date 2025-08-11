import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class BullMQService implements OnModuleInit {
  private redis: Redis;
  private emailQueue: Queue;
  private emailWorker: Worker;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.emailQueue = new Queue('email', {
      connection: this.redis,
    });
  }

  async onModuleInit() {
    // Create worker to process email jobs
    this.emailWorker = new Worker(
      'email',
      async (job: Job<EmailJobData>) => {
        console.log(
          `Processing email job ${job.id} for recipient: ${job.data.to.replace(/(.{3}).*@/, '$1***@')}`
        );

        // Simulate email sending
        await this.sendEmail(job.data);

        console.log(`Email job ${job.id} completed`);
      },
      {
        connection: this.redis,
      }
    );

    this.emailWorker.on('completed', (job) => {
      console.log(`Email job ${job.id} has completed`);
    });

    this.emailWorker.on('failed', (job, err) => {
      console.log(`Email job ${job?.id} has failed with error:`, err.message);
    });
  }

  async addEmailJob(emailData: EmailJobData, delay?: number) {
    return this.emailQueue.add('send-email', emailData, {
      delay,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async sendWelcomeEmail(email: string, name?: string) {
    return this.addEmailJob({
      to: email,
      subject: 'Welcome to our platform!',
      body: `Hello ${name || 'there'}! Welcome to our platform.`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    return this.addEmailJob({
      to: email,
      subject: 'Password Reset Request',
      body: `Click here to reset your password: /reset-password?token=${resetToken}`,
    });
  }

  private async sendEmail(data: EmailJobData) {
    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In real implementation, you would use a service like SendGrid, Mailgun, etc.
    console.log(
      '📧 Email sent to:',
      data.to.replace(/(.{3}).*@/, '$1***@'),
      'Subject:',
      data.subject
    );
  }

  async getQueueStats() {
    const waiting = await this.emailQueue.getWaiting();
    const active = await this.emailQueue.getActive();
    const completed = await this.emailQueue.getCompleted();
    const failed = await this.emailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
