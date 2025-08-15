import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/common/prisma.service';
import { RedisClient } from '../src/modules/auth/redis.client';

describe.skip('Auth Integration Tests', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService, RedisClient],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);

    // PrismaService extends PrismaClient, so it has $connect method
    try {
      await (prisma as any).$connect();
    } catch (error) {
      console.warn('Could not connect to database for integration test:', error.message);
    }
  });

  afterAll(async () => {
    try {
      await (prisma as any).$disconnect();
    } catch (error) {
      console.warn('Could not disconnect from database:', error.message);
    }
  });

  beforeEach(async () => {
    try {
      await (prisma as any).refreshToken.deleteMany();
      await (prisma as any).user.deleteMany();
    } catch (error) {
      console.warn('Could not clean database:', error.message);
    }
  });

  it('should register and authenticate user', async () => {
    const email = 'test@integration.com';
    const user = await authService.register(email, 'password123', 'Test User');
    expect(user.email).toBe(email);

    const authenticated = await authService.validateUser(email, 'password123');
    expect(authenticated.email).toBe(email);
  });
});
