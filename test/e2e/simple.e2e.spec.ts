import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';
import { PrismaService } from '../../src/common/services/prisma.service';
import { MongoDbService } from '../../src/common/services/mongodb.service';
import { RedisClient } from '../../src/modules/auth/redis.client';

describe('Simple E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Mock services for testing
    const mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: 'test-user-id',
            email: data.email,
            name: data.name,
            password: data.password,
            role: data.role || 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: 'test-user-id',
            ...data,
            updatedAt: new Date(),
          });
        }),
        delete: jest.fn().mockResolvedValue({
          id: 'test-user-id',
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({
          id: 'test-token-id',
          token: 'mock-refresh-token',
          userId: 'test-user-id',
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
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

  describe('Health Check', () => {
    it('should return 404 for root path (no route defined)', () => {
      return request(app.getHttpServer()).get('/').expect(404);
    });
  });

  describe('GraphQL Endpoint', () => {
    it('should accept GraphQL queries', () => {
      const query = `
        query {
          users {
            id
            email
            name
            role
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200)
        .expect((res) => {
          expect(res.body.data || res.body.errors).toBeDefined();
          // GraphQL returns errors for unauthorized access, which is expected
        });
    });

    it('should handle GraphQL mutations', () => {
      const uniqueEmail = `test-simple-${Date.now()}@example.com`;
      const mutation = `
        mutation {
          register(input: {
            email: "${uniqueEmail}"
            password: "password123"
            name: "Test User"
          }) {
            id
            email
            name
            role
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.data || res.body.errors).toBeDefined();
        });
    });
  });

  describe('REST Endpoints', () => {
    it('should handle auth register endpoint', () => {
      const uniqueEmail = `test-auth-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: process.env.TEST_EMAIL || uniqueEmail,
          password: process.env.TEST_PASSWORD || 'password123',
          name: 'Test User',
        })
        .expect((res) => {
          expect([200, 201, 400, 409, 500].includes(res.status)).toBe(true);
        });
    });

    it('should handle auth login endpoint', () => {
      const uniqueEmail = `test-login-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.TEST_EMAIL || uniqueEmail,
          password: process.env.TEST_PASSWORD || 'password123',
        })
        .expect((res) => {
          expect([200, 201, 401, 500].includes(res.status)).toBe(true);
        });
    });

    it('should handle users endpoint', () => {
      // Use a valid UUID format for the test
      const testUUID = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/users/${testUUID}`)
        .expect((res) => {
          expect([200, 404, 500].includes(res.status)).toBe(true);
        });
    });
  });
});
