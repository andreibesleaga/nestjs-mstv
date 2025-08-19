import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/common/services/prisma.service';
import { RedisClient } from '../../src/modules/auth/redis.client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('Auth Integration Tests', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Create mock PrismaService for integration tests
    const mockPrismaService = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      user: {
        findUnique: jest.fn().mockResolvedValue(null), // Initially return null
        create: jest.fn().mockImplementation((data) =>
          Promise.resolve({
            id: '1',
            ...data.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'token', token: 'refresh' }),
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisClient,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock bcrypt.compare to return true for test password
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$mockHashedPassword');
  });

  it('should register and authenticate user', async () => {
    const email = 'test@integration.com';

    // First call: Register user (findUnique should return null)
    const user = await authService.register(email, 'password123', 'Test User');
    expect(user.email).toBe(email);

    // After registration, mock findUnique to return the created user for authentication
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: '1',
      email: 'test@integration.com',
      name: 'Test User',
      password: '$2b$12$mockHashedPassword', // Mock bcrypt hash
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const authenticated = await authService.validateUser(email, 'password123');
    expect(authenticated.email).toBe(email);
  });
});
