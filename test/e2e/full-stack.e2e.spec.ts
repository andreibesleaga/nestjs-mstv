import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';
import { PrismaService } from '../../src/common/services/prisma.service';
import { MongoDbService } from '../../src/common/services/mongodb.service';

describe('Full Stack E2E Tests', () => {
  let app: NestFastifyApplication;
  let prismaService: PrismaService;
  let mongoService: MongoDbService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Get service instances
    // prismaService = app.get<PrismaService>(PrismaService);
    // redisClient = app.get<RedisClient>(RedisClient);
    // mongoService = app.get<MongoDbService>(MongoDbService);
    // emailService = app.get<EmailingService>(EmailingService);
    // storageService = app.get<StorageService>(StorageService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Clean up any existing test data
    // await cleanupTestData();
  });

  afterAll(async () => {
    // await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Clean data between tests
    // await cleanupTestData();
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      const testUser = {
        email: 'full-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'Full E2E Test User'
      };

      // 1. Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('id');
      expect(registerResponse.body.email).toBe(testUser.email);

      // 2. Login user
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('refresh_token');
      authToken = loginResponse.body.access_token;

      // 3. Access protected route
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.user.email).toBe(testUser.email);

      // 4. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refresh_token })
        .expect(201);

      expect(refreshResponse.body).toHaveProperty('access_token');
    });
  });

  describe('User Management', () => {
    beforeEach(async () => {
      // Create authenticated user for tests
      const testUser = {
        email: 'user-mgmt-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'User Management Test'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should create, read, update, and delete users', async () => {
      // CREATE - Register new user
      const newUser = {
        email: 'crud-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'CRUD Test User'
      };

      const createResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      const createdUserId = createResponse.body.id;

      // READ - Get user list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body).toBeInstanceOf(Array);
      expect(listResponse.body.some(u => u.id === createdUserId)).toBe(true);

      // READ - Get specific user
      const getResponse = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.email).toBe(newUser.email);

      // UPDATE - Update user
      const updateData = { name: 'Updated CRUD Test User' };
      const updateResponse = await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateData.name);

      // DELETE - Delete user
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle user role management', async () => {
      const adminUser = {
        email: 'admin-e2e-test@example.com',
        password: 'AdminPassword123!',
        name: 'Admin Test User',
        role: 'admin'
      };

      const adminResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(adminUser)
        .expect(201);

      expect(adminResponse.body.role).toBe('admin');

      // Test that regular users get default role
      const regularUser = {
        email: 'regular-e2e-test@example.com',
        password: 'RegularPassword123!',
        name: 'Regular Test User'
      };

      const regularResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(regularUser)
        .expect(201);

      expect(regularResponse.body.role).toBe('user');
    });
  });

  describe('Demo Integration', () => {
    beforeEach(async () => {
      const testUser = {
        email: 'demo-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'Demo Test User'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should upload and download streams', async () => {
      const testFileContent = 'This is a test file for E2E streaming';
      const key = 'e2e-test-stream-file.txt';

      // Upload stream
      const uploadResponse = await request(app.getHttpServer())
        .post(`/demo/upload-stream?key=${key}&contentType=text/plain`)
        .send(testFileContent)
        .expect(201);

      expect(uploadResponse.body.ok).toBe(true);
      expect(uploadResponse.body.key).toBe(key);

      // Download stream
      const downloadResponse = await request(app.getHttpServer())
        .get(`/demo/download-stream?key=${key}&contentType=text/plain`)
        .expect(200);

      expect(downloadResponse.text).toBe(testFileContent);
    });

    it('should handle flaky service simulation', async () => {
      // First call should fail (simulated failure)
      await request(app.getHttpServer())
        .get('/demo/flaky?name=e2e-test&fail=1')
        .expect(500);

      // Second call should succeed
      const successResponse = await request(app.getHttpServer())
        .get('/demo/flaky?name=e2e-test&fail=0')
        .expect(200);

      expect(successResponse.body.ok).toBe(true);
      expect(successResponse.body.name).toBe('e2e-test');
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      const testUser = {
        email: 'perf-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'Performance Test User'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should handle health checks', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'unknown']).toContain(healthResponse.body.status);
      expect(healthResponse.body).toHaveProperty('checks');
      expect(healthResponse.body.checks).toHaveProperty('database');
      expect(healthResponse.body.checks).toHaveProperty('redis');
    });

    it('should handle metrics endpoint', async () => {
      const metricsResponse = await request(app.getHttpServer())
        .get('/microservice/metrics')
        .expect(200);

      expect(typeof metricsResponse.body).toBe('object');
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requestPromises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requestPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      const testUser = {
        email: 'error-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'Error Test User'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should handle invalid authentication', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should handle validation errors', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Too short
        name: ''
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should handle rate limiting', async () => {
      const requests = [];
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle resource not found', async () => {
      await request(app.getHttpServer())
        .get('/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get('/demo/download-stream?key=nonexistent-file-id')
        .expect(400); // Bad request for missing key
    });
  });

  describe('GraphQL Integration', () => {
    beforeEach(async () => {
      const testUser = {
        email: 'graphql-e2e-test@example.com',
        password: 'TestPassword123!',
        name: 'GraphQL Test User'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should handle GraphQL queries', async () => {
      const query = `
        query GetProfile {
          profile {
            id
            email
            name
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data.profile).toHaveProperty('email');
    });

    it('should handle GraphQL mutations', async () => {
      const mutation = `
        mutation UpdateProfile($input: UpdateProfileInput!) {
          updateProfile(input: $input) {
            id
            name
            email
          }
        }
      `;

      const variables = {
        input: {
          name: 'Updated GraphQL Test User'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('updateProfile');
      expect(response.body.data.updateProfile.name).toBe('Updated GraphQL Test User');
    });
  });
});
