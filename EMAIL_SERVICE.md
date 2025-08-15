# Email Service Configuration

## Overview

The application now has a dedicated email service that uses SMTP for sending emails and BullMQ for queue management. The email functionality has been split into two separate services:

1. **BullMQService** - Generic queue management for any type of job
2. **EmailingService** - Dedicated email sending with SMTP support

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Email/SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Application URL (used in email links)
APP_URL=http://localhost:3000
```

## SMTP Provider Setup

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password as `SMTP_PASS`

### Other Providers

- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`

## Usage

### Queuing Emails (Recommended)

```typescript
import { EmailingService } from '../common/emailing.service';

// Queue an email for background processing
await emailingService.queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Welcome to our platform',
  html: '<h1>Welcome!</h1><p>Welcome to our platform</p>',
});

// Queue with delay (5 seconds)
await emailingService.queueEmail(emailData, 5000);
```

### Immediate Email Sending

```typescript
// Send email immediately (blocks until sent)
await emailingService.sendImmediateEmail({
  to: 'user@example.com',
  subject: 'Urgent Message',
  body: 'This needs immediate attention',
});
```

### User-Specific Email Methods

```typescript
import { UserEmailService } from '../modules/users/messaging/user-email.service';

// Welcome email with HTML template
await userEmailService.sendWelcomeEmail('user@example.com', 'John Doe');

// Password reset with secure link
await userEmailService.sendPasswordResetEmail('user@example.com', 'reset-token-123');

// Email verification with link
await userEmailService.sendVerificationEmail('user@example.com', 'verify-token-456');
```

## Queue Monitoring

Check email queue statistics:

```typescript
const stats = await emailingService.getEmailQueueStats();
console.log(stats); // { waiting: 5, active: 1, completed: 100, failed: 2 }
```

## Service Architecture

### BullMQService (Generic Queue Manager)

- Creates and manages Redis-based queues
- Supports multiple queue types
- Handles job processing with workers
- Provides queue statistics

### EmailingService (Email-Specific)

- Uses BullMQService for queue management
- Handles SMTP configuration and connection
- Processes email jobs with Nodemailer
- Supports both HTML and plain text emails

### UserEmailService (User Domain)

- Provides user-specific email templates
- Handles welcome, reset, and verification emails
- Uses EmailingService for actual sending

## Testing

The services are designed to work in test environments:

- SMTP connections are disabled in test mode
- Emails are logged instead of sent
- All services are fully mockable

## Error Handling

- Failed SMTP connections are logged but don't crash the application
- Failed email jobs are retried automatically by BullMQ
- Queue errors are logged with detailed information
- Services gracefully degrade when Redis is unavailable
