import { Test, TestingModule } from '@nestjs/testing';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';

describe('GraphQL E2E', () => {
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

  describe('register mutation', () => {
    it('should register a new user', () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
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
          expect(res.body.data.register.email).toBe(uniqueEmail);
          expect(res.body.data.register.name).toBe('Test User');
          expect(res.body.data.register.role).toBe('user');
        });
    });

    it('should fail with invalid email', () => {
      const mutation = `
        mutation {
          register(input: {
            email: "invalid-email"
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
          expect(res.body.errors).toBeDefined();
        });
    });
  });

  describe('login mutation', () => {
    it('should login with valid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const registerMutation = `
        mutation {
          register(input: {
            email: "${uniqueEmail}"
            password: "password123"
            name: "Test User"
          }) {
            id
          }
        }
      `;

      await request(app.getHttpServer()).post('/graphql').send({ query: registerMutation });

      const loginMutation = `
        mutation {
          login(input: {
            email: "${uniqueEmail}"
            password: "password123"
          }) {
            access_token
            refresh_token
            user {
              id
              email
              name
              role
            }
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: loginMutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.login.access_token).toBeDefined();
          expect(res.body.data.login.refresh_token).toBeDefined();
          expect(res.body.data.login.user.email).toBe(uniqueEmail);
        });
    });

    it('should fail with invalid credentials', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const registerMutation = `
        mutation {
          register(input: {
            email: "${uniqueEmail}"
            password: "password123"
            name: "Test User"
          }) {
            id
          }
        }
      `;

      await request(app.getHttpServer()).post('/graphql').send({ query: registerMutation });

      const loginMutation = `
        mutation {
          login(input: {
            email: "${uniqueEmail}"
            password: "wrongpassword"
          }) {
            access_token
            refresh_token
            user {
              id
              email
            }
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: loginMutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
        });
    });
  });

  describe('refreshToken mutation', () => {
    it('should refresh token with valid refresh token', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const registerMutation = `
        mutation {
          register(input: {
            email: "${uniqueEmail}"
            password: "password123"
            name: "Test User"
          }) {
            id
          }
        }
      `;

      await request(app.getHttpServer()).post('/graphql').send({ query: registerMutation });

      const loginMutation = `
        mutation {
          login(input: {
            email: "${uniqueEmail}"
            password: "password123"
          }) {
            refresh_token
          }
        }
      `;

      const loginRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: loginMutation });

      const refreshToken = loginRes.body.data.login.refresh_token;

      const mutation = `
        mutation {
          refreshToken(input: {
            refresh_token: "${refreshToken}"
          }) {
            access_token
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.refreshToken.access_token).toBeDefined();
        });
    });
  });

  describe('logout mutation', () => {
    it('should logout successfully', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const registerMutation = `
        mutation {
          register(input: {
            email: "${uniqueEmail}"
            password: "password123"
            name: "Test User"
          }) {
            id
          }
        }
      `;

      await request(app.getHttpServer()).post('/graphql').send({ query: registerMutation });

      const loginMutation = `
        mutation {
          login(input: {
            email: "${uniqueEmail}"
            password: "password123"
          }) {
            refresh_token
          }
        }
      `;

      const loginRes = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: loginMutation });

      const refreshToken = loginRes.body.data.login.refresh_token;

      const mutation = `
        mutation {
          logout(input: {
            refresh_token: "${refreshToken}"
          }) {
            message
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.logout.message).toBe('Successfully logged out');
        });
    });
  });

  describe('users query', () => {
    it('should return users list', () => {
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
          expect(res.body.data.users).toBeDefined();
          expect(Array.isArray(res.body.data.users)).toBe(true);
        });
    });
  });

  describe('getAllUsers query', () => {
    it('should return all users', () => {
      const query = `
        query {
          getAllUsers {
            id
            email
            name
            role
            createdAt
          }
        }
      `;

      return request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.getAllUsers).toBeDefined();
          expect(Array.isArray(res.body.data.getAllUsers)).toBe(true);
        });
    });
  });
});
