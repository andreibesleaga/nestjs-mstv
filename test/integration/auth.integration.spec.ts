import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/packages/auth/src/auth.service';
import { PrismaService } from '../../src/common/prisma.service';
import { RedisClient } from '../../src/packages/auth/src/redis.client';

describe('Auth Integration Tests', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService, RedisClient],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should register and authenticate user', async () => {
    const email = 'test@integration.com';
    const user = await authService.register(email, 'password123', 'Test User');
    expect(user.email).toBe(email);

    const authenticated = await authService.validateUser(email, 'password123');
    expect(authenticated.email).toBe(email);
  });
});