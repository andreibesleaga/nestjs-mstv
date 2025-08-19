import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CheckPolicies, PoliciesGuard } from '../../modules/auth/policies.guard';

interface EmailRequest {
  to: string;
  subject?: string;
  name?: string;
  message?: string;
  template?: string;
}

// Mock EmailingService for now
class EmailingService {
  async queueEmail(data: any) {
    return 'mock-message-id';
  }

  async getEmailQueueStats() {
    return {
      pending: 0,
      processing: 0,
      completed: 10,
      failed: 0
    };
  }

  async deleteEmailJob(messageId: string) {
    return { success: true, messageId };
  }
}

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailingService: EmailingService) {}

  @Post('welcome')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send welcome email',
    description: 'Send a welcome email to a new user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', format: 'email' },
        name: { type: 'string' }
      },
      required: ['to', 'name']
    }
  })
  @ApiResponse({ status: 200, description: 'Email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendWelcomeEmail(@Body() emailData: EmailRequest) {
    if (!emailData.to || !emailData.name) {
      throw new Error('Missing required fields: to, name');
    }

    const messageId = await this.emailingService.queueEmail({
      to: emailData.to,
      subject: 'Welcome to our platform!',
      body: `Hello ${emailData.name}! Welcome to our application.`,
      html: `<h1>Welcome ${emailData.name}!</h1><p>Thank you for joining our application.</p>`,
    });

    return { 
      messageId,
      status: 'queued',
      message: 'Welcome email queued successfully'
    };
  }

  @Post('password-reset')
  @ApiOperation({
    summary: 'Send password reset email',
    description: 'Send a password reset email to a user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' }
      },
      required: ['email']
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  async sendPasswordResetEmail(@Body() emailData: { email: string }) {
    if (!emailData.email) {
      throw new Error('Email address is required');
    }

    const resetToken = 'dummy-reset-token-' + Date.now();
    const messageId = await this.emailingService.queueEmail({
      to: emailData.email,
      subject: 'Password Reset Request',
      body: `Your password reset token is: ${resetToken}`,
      html: `<p>Your password reset token is: <strong>${resetToken}</strong></p>
             <p>Click <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}">here</a> to reset your password.</p>`,
    });

    return { 
      messageId,
      status: 'queued',
      message: 'Password reset email queued successfully'
    };
  }

  @Post('notification')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send notification email',
    description: 'Send a custom notification email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', format: 'email' },
        subject: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['to', 'subject', 'message']
    }
  })
  @ApiResponse({ status: 200, description: 'Notification email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotificationEmail(@Body() emailData: EmailRequest) {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      throw new Error('Missing required fields: to, subject, message');
    }

    const messageId = await this.emailingService.queueEmail({
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.message,
      html: `<div style="padding: 20px; border: 1px solid #ddd;">
               <h3>${emailData.subject}</h3>
               <p>${emailData.message}</p>
             </div>`,
    });

    return { 
      messageId,
      status: 'queued',
      message: 'Notification email queued successfully'
    };
  }

  @Get('queue/stats')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('read', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email queue statistics',
    description: 'Get statistics about the email queue',
  })
  @ApiResponse({ status: 200, description: 'Email queue statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmailQueueStats() {
    const stats = await this.emailingService.getEmailQueueStats();
    return {
      ...stats,
      status: 'ok'
    };
  }
}
