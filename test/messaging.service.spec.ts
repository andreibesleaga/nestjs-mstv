import { KafkaService } from '../src/packages/messaging/src/kafka.service';
import { BullMQService } from '../src/packages/messaging/src/bullmq.service';

describe('KafkaService', () => {
  let service: KafkaService;

  beforeEach(() => {
    service = new KafkaService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish user registered event', async () => {
    const spy = jest.spyOn(service, 'publishMessage').mockResolvedValue(undefined);

    await service.publishUserRegistered('user123', 'test@example.com');

    expect(spy).toHaveBeenCalledWith('user.events', {
      event: 'user.registered',
      userId: 'user123',
      email: 'test@example.com',
      timestamp: expect.any(String),
    });
  });

  it('should publish user logged in event', async () => {
    const spy = jest.spyOn(service, 'publishMessage').mockResolvedValue(undefined);

    await service.publishUserLoggedIn('user123');

    expect(spy).toHaveBeenCalledWith('user.events', {
      event: 'user.logged_in',
      userId: 'user123',
      timestamp: expect.any(String),
    });
  });
});

describe('BullMQService', () => {
  let service: BullMQService;

  beforeEach(() => {
    service = new BullMQService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add welcome email job', async () => {
    const spy = jest.spyOn(service, 'addEmailJob').mockResolvedValue({} as any);

    await service.sendWelcomeEmail('test@example.com', 'Test User');

    expect(spy).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Welcome to our platform!',
      body: 'Hello Test User! Welcome to our platform.',
    });
  });

  it('should add password reset email job', async () => {
    const spy = jest.spyOn(service, 'addEmailJob').mockResolvedValue({} as any);

    await service.sendPasswordResetEmail('test@example.com', 'reset123');

    expect(spy).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Password Reset Request',
      body: 'Click here to reset your password: /reset-password?token=reset123',
    });
  });
});
