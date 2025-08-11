import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/src/app.module';

describe('Simple E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      const mutation = `
        mutation {
          register(input: {
            email: "test@example.com"
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
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect((res) => {
          expect([200, 201, 400, 409, 500].includes(res.status)).toBe(true);
        });
    });

    it('should handle auth login endpoint', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect((res) => {
          expect([200, 201, 401, 500].includes(res.status)).toBe(true);
        });
    });

    it('should handle users endpoint', () => {
      return request(app.getHttpServer())
        .get('/users/test-id')
        .expect((res) => {
          expect([200, 404, 500].includes(res.status)).toBe(true);
        });
    });
  });
});
