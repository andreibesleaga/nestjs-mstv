import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/src/app.module';

describe('Mock E2E Tests (No Database)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Override environment to avoid database connections
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REDIS_URL = 'redis://localhost:6379';

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
