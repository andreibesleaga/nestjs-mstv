import { UserEmailService } from '../src/modules/users/messaging/user-email.service';
import { EmailingService } from '../src/common/emailing.service';

describe('UserEmailService', () => {
  let userEmailService: UserEmailService;
  let mockEmailingService: Partial<EmailingService>;

  beforeEach(() => {
    mockEmailingService = {
      queueEmail: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      sendImmediateEmail: jest.fn().mockResolvedValue(undefined),
    };

    userEmailService = new UserEmailService(mockEmailingService as EmailingService);
  });

  describe('sendWelcomeEmail', () => {
    it('should queue a welcome email', async () => {
      const email = 'test@example.com';
      const name = 'John Doe';

      await userEmailService.sendWelcomeEmail(email, name);

      expect(mockEmailingService.queueEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Welcome to our platform!',
        body: 'Hello John Doe! Welcome to our platform.',
        html: '<h1>Welcome!</h1><p>Hello <strong>John Doe</strong>!</p><p>Welcome to our platform.</p>',
      });
    });

    it('should handle missing name parameter', async () => {
      const email = 'test@example.com';

      await userEmailService.sendWelcomeEmail(email);

      expect(mockEmailingService.queueEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Welcome to our platform!',
        body: 'Hello there! Welcome to our platform.',
        html: '<h1>Welcome!</h1><p>Hello <strong>there</strong>!</p><p>Welcome to our platform.</p>',
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should queue a password reset email', async () => {
      const email = 'test@example.com';
      const resetToken = 'reset-token-123';

      await userEmailService.sendPasswordResetEmail(email, resetToken);

      expect(mockEmailingService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Password Reset Request',
          body: expect.stringContaining(resetToken),
          html: expect.stringContaining(resetToken),
        })
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('should queue an email verification email', async () => {
      const email = 'test@example.com';
      const verificationToken = 'verify-token-123';

      await userEmailService.sendVerificationEmail(email, verificationToken);

      expect(mockEmailingService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Email Verification',
          body: expect.stringContaining(verificationToken),
          html: expect.stringContaining(verificationToken),
        })
      );
    });
  });

  describe('sendImmediateEmail', () => {
    it('should send an immediate email', async () => {
      const to = 'test@example.com';
      const subject = 'Urgent Message';
      const body = 'This is urgent';
      const html = '<p>This is urgent</p>';

      await userEmailService.sendImmediateEmail(to, subject, body, html);

      expect(mockEmailingService.sendImmediateEmail).toHaveBeenCalledWith({
        to,
        subject,
        body,
        html,
      });
    });
  });
});
