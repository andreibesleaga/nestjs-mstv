import { Test, TestingModule } from '@nestjs/testing';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/src/app.module';

describe('Users E2E', () => {
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

    it('should return null for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeNull();
        });
    });
  });
});
