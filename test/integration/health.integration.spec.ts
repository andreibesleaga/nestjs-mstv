import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../../src/common/services/health.service';
import { PrismaService } from '../../src/common/services/prisma.service';
import { MongoDbService } from '../../src/common/services/mongodb.service';
import { RedisClient } from '../../src/modules/auth/redis.client';

type MockedPrismaService = {
  $queryRaw: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

type MockedMongoService = {
  getDb: jest.Mock;
};

type MockedRedisClient = {
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
};

describe('HealthService Integration Tests', () => {
  let healthService: HealthService;
  let prismaService: MockedPrismaService;
  let mongoService: MockedMongoService;
  let redisClient: MockedRedisClient;

  beforeAll(async () => {
    // Mock services
    const mockPrismaService = {
      // Mock $queryRaw as both function and tagged template literal
      $queryRaw: jest.fn().mockImplementation((query, ..._params) => {
        // Handle both function calls and tagged template literals
        if (typeof query === 'string' || Array.isArray(query)) {
          return Promise.resolve([{ result: 1 }]);
        }
        return Promise.resolve([{ result: 1 }]);
      }),
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const mockMongoService = {
      getDb: jest.fn().mockReturnValue({
        command: jest.fn().mockResolvedValue({ ok: 1 }),
      }),
    };

    const mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          DATABASE_TYPE: 'postgresql',
          REDIS_URL: 'redis://localhost:6379',
          NODE_ENV: 'test',
        };
        return config[key] || process.env[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MongoDbService,
          useValue: mockMongoService,
        },
        {
          provide: RedisClient,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    healthService = module.get<HealthService>(HealthService);
    prismaService = module.get(PrismaService) as MockedPrismaService;
    mongoService = module.get(MongoDbService) as MockedMongoService;
    redisClient = module.get(RedisClient) as MockedRedisClient;
  });

  beforeEach(() => {
    // Reset calls and reapply sensible defaults for mocks between tests
    jest.clearAllMocks();
    // Ensure Prisma defaults to healthy unless a test overrides
    prismaService.$queryRaw.mockImplementation((query, ..._params) => {
      // Handle both function calls and tagged template literals
      if (typeof query === 'string' || Array.isArray(query)) {
        return Promise.resolve([{ result: 1 }]);
      }
      return Promise.resolve([{ result: 1 }]);
    });
    // Redis defaults to healthy unless overridden
    redisClient.set.mockResolvedValue('OK' as any);
  });

  describe('Database Health Checks', () => {
    it('should check PostgreSQL health successfully', async () => {
      const prev = process.env.DATABASE_TYPE;
      process.env.DATABASE_TYPE = 'postgresql';
      try {
        prismaService.$queryRaw.mockImplementation(() => Promise.resolve([{ result: 1 }]));

        const health = await healthService.checkDatabase();

        expect(health.status).toBe('healthy');
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
        expect(prismaService.$queryRaw).toHaveBeenCalled();
      } finally {
        process.env.DATABASE_TYPE = prev;
      }
    });

    it('should detect PostgreSQL connection issues', async () => {
      const prev = process.env.DATABASE_TYPE;
      process.env.DATABASE_TYPE = 'postgresql';
      try {
        prismaService.$queryRaw.mockImplementation(() =>
          Promise.reject(new Error('Connection failed'))
        );

        const health = await healthService.checkDatabase();

        expect(health.status).toBe('unhealthy');
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
      } finally {
        process.env.DATABASE_TYPE = prev;
      }
    });

    it('should check MongoDB health successfully', async () => {
      const prev = process.env.DATABASE_TYPE;
      process.env.DATABASE_TYPE = 'mongodb';
      try {
        // Mock MongoDB database command
        mongoService.getDb.mockReturnValue({
          command: jest.fn().mockResolvedValue({ ok: 1 }),
        } as any);

        const health = await healthService.checkDatabase();

        expect(health.status).toBe('healthy');
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
      } finally {
        process.env.DATABASE_TYPE = prev;
      }
    });

    it('should detect MongoDB connection issues', async () => {
      const prev = process.env.DATABASE_TYPE;
      process.env.DATABASE_TYPE = 'mongodb';
      try {
        mongoService.getDb.mockReturnValue({
          command: jest.fn().mockRejectedValue(new Error('MongoDB connection failed')),
        } as any);

        const health = await healthService.checkDatabase();

        expect(health.status).toBe('unhealthy');
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
      } finally {
        process.env.DATABASE_TYPE = prev;
      }
    });
  });

  describe('Redis Health Checks', () => {
    it('should check Redis health successfully', async () => {
      redisClient.set.mockResolvedValue('OK');

      const health = await healthService.checkRedis();

      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect Redis connection issues', async () => {
      redisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      const health = await healthService.checkRedis();

      expect(health.status).toBe('unhealthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Detailed Health Information', () => {
    it('should provide comprehensive health information', async () => {
      prismaService.$queryRaw.mockImplementation(() => Promise.resolve([{ result: 1 }]));
      redisClient.set.mockResolvedValue('OK');

      const detailedHealth = await healthService.getDetailedHealth();

      expect(detailedHealth.status).toBe('healthy');
      expect(detailedHealth.timestamp).toBeDefined();
      expect(detailedHealth.uptime).toBeGreaterThan(0);
      expect(detailedHealth.version).toBeDefined();
      expect(detailedHealth.checks).toHaveProperty('database');
      expect(detailedHealth.checks).toHaveProperty('redis');
      expect(detailedHealth.checks.database.status).toBe('healthy');
      expect(detailedHealth.checks.redis.status).toBe('healthy');
    });

    it('should report unhealthy status when services are down', async () => {
      prismaService.$queryRaw.mockImplementation(() =>
        Promise.reject(new Error('DB connection failed'))
      );
      redisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      const detailedHealth = await healthService.getDetailedHealth();

      expect(detailedHealth.status).toBe('unhealthy');
      expect(detailedHealth.checks.database.status).toBe('unhealthy');
      expect(detailedHealth.checks.redis.status).toBe('unhealthy');
    });

    it('should handle mixed service health statuses', async () => {
      prismaService.$queryRaw.mockImplementation(() => Promise.resolve([{ result: 1 }]));
      redisClient.set.mockRejectedValue(new Error('Redis down'));

      const detailedHealth = await healthService.getDetailedHealth();

      // Service reports 'unhealthy' when any service is unhealthy
      expect(detailedHealth.status).toBe('unhealthy');
      expect(detailedHealth.checks.database.status).toBe('healthy');
      expect(detailedHealth.checks.redis.status).toBe('unhealthy');
    });
  });

  describe('Performance Testing', () => {
    it('should complete health checks within reasonable time', async () => {
      const startTime = Date.now();

      await healthService.getDetailedHealth();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent health check requests', async () => {
      const healthChecks = Array(5)
        .fill(null)
        .map(() => healthService.getDetailedHealth());

      const results = await Promise.all(healthChecks);

      results.forEach((result) => {
        expect(result.status).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.checks).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // Test when all services fail
      prismaService.$queryRaw.mockImplementation(() =>
        Promise.reject(new Error('All services down'))
      );
      redisClient.set.mockRejectedValue(new Error('All services down'));

      const health = await healthService.getDetailedHealth();

      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(health.checks).toBeDefined();
    });

    it('should provide meaningful error responses', async () => {
      const testError = new Error('Connection timeout');
      prismaService.$queryRaw.mockImplementation(() => Promise.reject(testError));

      const health = await healthService.checkDatabase();

      expect(health.status).toBe('unhealthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });
  });
});
