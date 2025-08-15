import { EmailingService } from '../src/common/emailing.service';
import { BullMQService } from '../src/common/messaging/bullmq.service';

describe('EmailingService', () => {
  let emailingService: EmailingService;
  let mockBullMQService: Partial<BullMQService>;

  beforeEach(() => {
    mockBullMQService = {
      createQueue: jest.fn(),
      addJob: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      getQueueStats: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 1,
        failed: 0,
      }),
    };

    emailingService = new EmailingService(mockBullMQService as BullMQService);
  });

  describe('queueEmail', () => {
    it('should queue an email job', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const result = await emailingService.queueEmail(emailData);

      expect(mockBullMQService.addJob).toHaveBeenCalledWith('email', 'send-email', emailData, {});
      expect(result).toEqual({ id: 'test-job-id' });
    });

    it('should queue an email job with delay', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };
      const delay = 5000;

      await emailingService.queueEmail(emailData, delay);

      expect(mockBullMQService.addJob).toHaveBeenCalledWith('email', 'send-email', emailData, {
        delay,
      });
    });
  });

  describe('getEmailQueueStats', () => {
    it('should return email queue statistics', async () => {
      const stats = await emailingService.getEmailQueueStats();

      expect(mockBullMQService.getQueueStats).toHaveBeenCalledWith('email');
      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 1,
        failed: 0,
      });
    });
  });

  describe('sendEmail', () => {
    it('should log test message in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const logSpy = jest.spyOn(emailingService['logger'], 'log');

      await emailingService.sendEmail(emailData);

      expect(logSpy).toHaveBeenCalledWith(
        '[TEST] Email would be sent to: test@example.com - Test Email'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
