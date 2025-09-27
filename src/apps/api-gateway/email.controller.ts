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

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor() {}

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
        name: { type: 'string' },
      },
      required: ['to', 'name'],
    },
  })
  @ApiResponse({ status: 200, description: 'Email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendWelcomeEmail(@Body() emailData: EmailRequest) {
    if (!emailData.to || !emailData.name) {
      throw new Error('Missing required fields: to, name');
    }

    const messageId = `mock-welcome-${Date.now()}`;

    return {
      success: true,
      messageId,
      recipient: emailData.to,
      template: 'welcome',
      status: 'queued',
      message: 'Welcome email queued successfully',
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
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  async sendPasswordResetEmail(@Body() emailData: { email: string }) {
    if (!emailData.email) {
      throw new Error('Email address is required');
    }

    const resetToken = 'dummy-reset-token-' + Date.now();
    const messageId = `mock-reset-${Date.now()}`;

    return {
      messageId,
      resetToken,
      recipient: emailData.email,
      status: 'queued',
      message: 'Password reset email queued successfully',
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
        message: { type: 'string' },
      },
      required: ['to', 'subject', 'message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Notification email queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotificationEmail(@Body() emailData: EmailRequest) {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      throw new Error('Missing required fields: to, subject, message');
    }

    const messageId = `mock-notification-${Date.now()}`;

    return {
      messageId,
      recipient: emailData.to,
      subject: emailData.subject,
      status: 'queued',
      message: 'Notification email queued successfully',
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
    return {
      pending: 0,
      processing: 0,
      completed: 10,
      failed: 0,
      status: 'ok',
    };
  }

  @Delete('queue/:messageId')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can('delete', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete email from queue',
    description: 'Remove an email from the queue by message ID',
  })
  @ApiResponse({ status: 200, description: 'Email deleted from queue successfully' })
  @ApiResponse({ status: 404, description: 'Email not found in queue' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteEmailFromQueue(@Param('messageId') messageId: string) {
    return {
      success: true,
      messageId,
      message: 'Email deleted from queue successfully',
    };
  }
}
