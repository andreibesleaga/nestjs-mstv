import { Test, TestingModule } from '@nestjs/testing';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';

describe('Auth E2E', () => {
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

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe(uniqueEmail);
          expect(res.body.name).toBe('Test User');
          expect(res.body.role).toBe('user');
          expect(res.body.id).toBeDefined();
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      const uniqueEmail = `test-short-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/auth/register').send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.refresh_token).toBeDefined();
          expect(res.body.user.email).toBe(uniqueEmail);
        });
    });

    it('should fail with invalid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/auth/register').send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/auth/register').send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        email: uniqueEmail,
        password: 'password123',
      });

      const refreshToken = loginRes.body.refresh_token;

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
        });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/auth/register').send({
        email: uniqueEmail,
        password: 'password123',
        name: 'Test User',
      });

      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        email: uniqueEmail,
        password: 'password123',
      });

      const refreshToken = loginRes.body.refresh_token;

      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Successfully logged out');
        });
    });
  });
});
