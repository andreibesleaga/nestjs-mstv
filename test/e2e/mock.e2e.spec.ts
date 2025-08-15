import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { MongoDbService } from '../../src/common/mongodb.service';
import { RedisClient } from '../../src/packages/auth/src/redis.client';

describe('Mock E2E Tests (No Database)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Override environment to avoid database connections
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REDIS_URL = 'redis://localhost:6379';

    // Create comprehensive mocks
    const mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.email === 'test@example.com') {
            return Promise.resolve({
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              password: 'hashedPassword',
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedPassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'token123', token: 'refresh123' }),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockMongoDbService = {
      getDb: jest.fn().mockReturnValue({
        command: jest.fn().mockResolvedValue({ ok: 1 }),
      }),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('ok'),
      del: jest.fn().mockResolvedValue(1),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(MongoDbService)
      .useValue(mockMongoDbService)
      .overrideProvider(RedisClient)
      .useValue(mockRedisClient)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Health', () => {
    it('should start the application', () => {
      expect(app).toBeDefined();
    });

    it('should return 404 for undefined routes', () => {
      return request(app.getHttpServer()).get('/undefined-route').expect(404);
    });
  });

  describe('GraphQL Endpoint', () => {
    it('should respond to GraphQL endpoint', () => {
      const query = `query { __typename }`;

      return request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);
    });
  });

  describe('REST Endpoints Structure', () => {
    it('should have auth endpoints available', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect((res) => {
          // Should get validation error, not 404
          expect([400, 500].includes(res.status)).toBe(true);
        });
    });
  });
});
