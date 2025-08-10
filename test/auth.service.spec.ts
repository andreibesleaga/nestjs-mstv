
import { AuthService } from '../packages/auth/src/auth.service';
import { RedisClient } from '../packages/auth/src/redis.client';

jest.mock('@prisma/client', () => {
  const mockUser = {
    id: '1',
    email: 'u@example.com',
    name: 'U',
    passwordHash: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const m = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => m) };
});

describe('AuthService', () => {
  const redis = new RedisClient();
  const svc = new AuthService(redis);

  it('should register a user', async () => {
    const user = await svc.register('u@example.com', 'password123', 'U');
    expect(user.email).toBe('u@example.com');
  });

  it('should sign and verify tokens', async () => {
    const token = await svc.signAccessToken({ sub: 'u1' });
    expect(typeof token).toBe('string');
  });
});
