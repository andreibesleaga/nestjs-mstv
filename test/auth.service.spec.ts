import { AuthService } from '../src/modules/auth/auth.service';
import { RedisClient } from '../src/modules/auth/redis.client';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('@prisma/client', () => {
  const mockUser = {
    id: '1',
    email: 'u@example.com',
    name: 'U',
    password: 'hashedPassword',
    role: 'user',
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
  const mockUser = {
    id: '1',
    email: 'u@example.com',
    name: 'U',
    password: 'hashedPassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'token123', token: 'refresh123' }),
    },
  } as any;
  const svc = new AuthService(redis, mockPrisma);

  it('should register a user', async () => {
    const user = await svc.register('u@example.com', 'password123', 'U');
    expect(user.email).toBe('u@example.com');
  });

  it('should sign and verify tokens', async () => {
    const token = await svc.signAccessToken({ sub: 'u1', email: 'test@example.com', role: 'user' });
    expect(typeof token).toBe('string');
  });
});
