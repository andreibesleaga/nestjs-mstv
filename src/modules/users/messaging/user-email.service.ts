import { Injectable } from '@nestjs/common';
import { EmailingService } from '../../../common/emailing.service';

@Injectable()
export class UserEmailService {
  constructor(private readonly emailingService: EmailingService) {}

  async sendWelcomeEmail(email: string, name?: string) {
    return this.emailingService.queueEmail({
      to: email,
      subject: 'Welcome to our platform!',
      body: `Hello ${name || 'there'}! Welcome to our platform.`,
      html: `<h1>Welcome!</h1><p>Hello <strong>${name || 'there'}</strong>!</p><p>Welcome to our platform.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    return this.emailingService.queueEmail({
      to: email,
      subject: 'Password Reset Request',
      body: `Click here to reset your password: ${resetUrl}`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  async sendVerificationEmail(email: string, verificationToken: string) {
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    return this.emailingService.queueEmail({
      to: email,
      subject: 'Email Verification',
      body: `Click here to verify your email: ${verifyUrl}`,
      html: `
        <h2>Email Verification</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  async sendImmediateEmail(to: string, subject: string, body: string, html?: string) {
    return this.emailingService.sendImmediateEmail({
      to,
      subject,
      body,
      html,
    });
  }
}
