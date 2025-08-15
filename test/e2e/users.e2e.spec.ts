import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { MongoDbService } from '../../src/common/mongodb.service';
import { RedisClient } from '../../src/modules/auth/redis.client';

describe('Users E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Create dynamic mock services that handle different emails properly
    const createdUsers = new Map();
    let userCounter = 1;

    const mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.email) {
            const user = createdUsers.get(where.email);
            return Promise.resolve(user || null);
          }
          if (where.id) {
            const user = Array.from(createdUsers.values()).find((u) => u.id === where.id);
            return Promise.resolve(user || null);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newUser = {
            id: `123e4567-e89b-12d3-a456-42661417400${userCounter}`, // Generate UUID-like ID
            email: data.email,
            name: data.name,
            password: data.password,
            role: data.role || 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          userCounter++;
          createdUsers.set(data.email, newUser);
          return Promise.resolve(newUser);
        }),
        findMany: jest.fn().mockImplementation(() => {
          return Promise.resolve(Array.from(createdUsers.values()));
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const user =
            createdUsers.get(where.email) ||
            Array.from(createdUsers.values()).find((u) => u.id === where.id);
          if (user) {
            const updatedUser = { ...user, ...data, updatedAt: new Date() };
            createdUsers.set(user.email, updatedUser);
            return Promise.resolve(updatedUser);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const user =
            createdUsers.get(where.email) ||
            Array.from(createdUsers.values()).find((u) => u.id === where.id);
          if (user) {
            createdUsers.delete(user.email);
            return Promise.resolve(user);
          }
          return Promise.resolve(null);
        }),
      },
      refreshToken: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'token' + Date.now(),
            token: data.token,
            userId: data.userId,
            expiresAt: data.expiresAt,
            createdAt: new Date(),
          })
        ),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.token) {
            return Promise.resolve({
              id: 'token123',
              token: where.token,
              userId: '1',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              user: Array.from(createdUsers.values())[0] || null,
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.token) {
            return Promise.resolve({
              id: 'token123',
              token: where.token,
              userId: '1',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              user: Array.from(createdUsers.values())[0] || null,
            });
          }
          return Promise.resolve(null);
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  describe('GET /users/:id', () => {
    it('should get user by id', async () => {
      // Create a user first
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

      const userId = registerRes.body.id;

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe(uniqueEmail);
          expect(res.body.name).toBe('Test User');
        });
    });

    it('should return 404 for non-existent user', () => {
      // Use a valid UUID format that doesn't exist in our mock
      const nonExistentUUID = '123e4567-e89b-12d3-a456-426614174999';
      return request(app.getHttpServer()).get(`/users/${nonExistentUUID}`).expect(404);
    });
  });
});
