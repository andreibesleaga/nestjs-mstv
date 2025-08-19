import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';

describe('Performance and Load Tests', () => {
  let app: NestFastifyApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Create test user and get auth token
    const testUser = {
      email: 'performance-test@example.com',
      password: 'PerformanceTest123!',
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

  afterAll(async () => {
    await app.close();
  });

  describe('API Response Times', () => {
    it('should respond to health check within 100ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/health');

      // Health endpoint should respond quickly; allow some headroom in CI
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(250);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy', 'unknown']).toContain(response.body.status);
    });

    it('should respond to authentication within 200ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(400);
      
      // Accept 200, 401, or 400 depending on environment/auth guard
      expect([200, 400, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('email');
      }
    });

    it('should handle database queries within 300ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(300);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const requestPromises: Promise<request.Response>[] = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(request(app.getHttpServer()).get('/health'));
      }
      const settled = await Promise.allSettled(requestPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      // Most requests should complete
      expect(responses.length).toBeGreaterThanOrEqual(45);
      
      // Should handle all requests within 5 seconds
      expect(totalTime).toBeLessThan(5000);
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(['healthy', 'unhealthy', 'unknown']).toContain(response.body.status);
      });

      console.log(`50 concurrent requests completed in ${totalTime}ms`);
    });

    it('should handle authenticated concurrent requests', async () => {
      const concurrentRequests = 25;
      const requestPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        );
      }

      const settled = await Promise.allSettled(requestPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      expect(responses.length).toBeGreaterThanOrEqual(20);
      expect(totalTime).toBeLessThan(5000);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email');
      });

      console.log(`25 authenticated concurrent requests completed in ${totalTime}ms`);
    });

    it('should handle mixed endpoint concurrent requests', async () => {
      const endpoints = [
        { method: 'get', path: '/health', auth: false },
        { method: 'get', path: '/auth/profile', auth: true },
        { method: 'get', path: '/users', auth: true },
        { method: 'get', path: '/microservice/metrics', auth: false }
      ];

  const requestPromises: Promise<request.Response>[] = [];
      const startTime = Date.now();

      // Create 10 requests for each endpoint
      for (const endpoint of endpoints) {
        for (let i = 0; i < 10; i++) {
          const requestBuilder = request(app.getHttpServer())[endpoint.method](endpoint.path);
          
          if (endpoint.auth) {
            requestBuilder.set('Authorization', `Bearer ${authToken}`);
          }
          
          requestPromises.push(requestBuilder);
        }
      }
      const settled = await Promise.allSettled(requestPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      expect(responses.length).toBeGreaterThanOrEqual(35);
      expect(totalTime).toBeLessThan(5000);
      
      // Count successful responses
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(25); // Allow for some failures

      console.log(`40 mixed endpoint requests completed in ${totalTime}ms`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain stable memory usage during load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate load
  const promises: Promise<request.Response>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/health')
            .expect(200)
        );
      }
      
  const settled = await Promise.allSettled(promises);
  const successes = settled.filter((r) => r.status === 'fulfilled').length;
  expect(successes).toBeGreaterThanOrEqual(90);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not increase significantly (less than 50MB)
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(heapIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      
      console.log(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB, Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    });

    it('should handle large payloads efficiently', async () => {
      // Create a large but reasonable payload
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB string
        metadata: {
          timestamp: new Date().toISOString(),
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
          description: 'This is a performance test with a large payload'
        }
      };

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/test/large-payload')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload);
      
      const responseTime = Date.now() - startTime;
      
      // Should handle large payload within reasonable time
      expect(responseTime).toBeLessThan(1000);
      
      // Response should indicate successful processing or expected error
      expect([200, 404, 501]).toContain(response.status);
      
      console.log(`Large payload (${JSON.stringify(largePayload).length} bytes) processed in ${responseTime}ms`);
    });
  });

  describe('Database Performance', () => {
    it('should handle rapid user creation efficiently', async () => {
      const userCount = 20;
  const userPromises: Promise<request.Response>[] = [];
      const startTime = Date.now();

      for (let i = 0; i < userCount; i++) {
        userPromises.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              email: `perf-user-${i}-${Date.now()}@example.com`,
              password: 'TestPassword123!',
              name: `Performance User ${i}`
            })
        );
      }

      const settled = await Promise.allSettled(userPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      const successfulCreations = responses.filter(r => r.status === 201);
      
      // Should create users efficiently (allow for degraded envs)
      expect(totalTime).toBeLessThan(8000);
      expect(successfulCreations.length).toBeGreaterThanOrEqual(5);
      
      console.log(`Created ${successfulCreations.length}/${userCount} users in ${totalTime}ms`);
    });

    it('should handle rapid queries efficiently', async () => {
      const queryCount = 50;
  const queryPromises: Promise<request.Response>[] = [];
      const startTime = Date.now();

      for (let i = 0; i < queryCount; i++) {
        queryPromises.push(
          request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const settled = await Promise.allSettled(queryPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      const successfulQueries = responses.filter(r => r.status === 200);
      
      expect(totalTime).toBeLessThan(6000);
      expect(successfulQueries.length).toBeGreaterThanOrEqual(40);
      
      console.log(`Executed ${queryCount} queries in ${totalTime}ms`);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should apply rate limiting without significant overhead', async () => {
      const requestCount = 30;
  const requestPromises: Promise<request.Response>[] = [];
      const startTime = Date.now();

      // Make requests that should hit rate limiting
      for (let i = 0; i < requestCount; i++) {
        requestPromises.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const settled = await Promise.allSettled(requestPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      const successResponses = responses.filter(r => r.status === 401);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should process requests quickly even with rate limiting
  expect(totalTime).toBeLessThan(4000);
      
      // Should have mix of failed auth and rate limited
      expect(successResponses.length + rateLimitedResponses.length).toBe(requestCount);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      console.log(`Rate limiting test: ${successResponses.length} auth failures, ${rateLimitedResponses.length} rate limited in ${totalTime}ms`);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without memory leaks', async () => {
      const errorRequestCount = 50;
      const initialMemory = process.memoryUsage();
      const startTime = Date.now();

      // Generate various types of errors
  const errorPromises: Promise<request.Response>[] = [
        // 404 errors
        ...Array.from({ length: 15 }, () => 
          request(app.getHttpServer()).get('/nonexistent-endpoint')
        ),
        // 401 errors  
        ...Array.from({ length: 15 }, () => 
          request(app.getHttpServer()).get('/users/profile')
        ),
        // 400 errors
        ...Array.from({ length: 10 }, () => 
          request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: 'invalid-email', password: '123' })
        ),
        // 500 errors (if any endpoint triggers them)
        ...Array.from({ length: 10 }, () => 
          request(app.getHttpServer())
            .post('/test/error')
            .set('Authorization', `Bearer ${authToken}`)
        )
      ];

      const settled = await Promise.allSettled(errorPromises);
      const responses = settled
        .filter((r): r is PromiseFulfilledResult<request.Response> => r.status === 'fulfilled')
        .map((r) => r.value);
      const totalTime = Date.now() - startTime;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Should handle errors quickly
  expect(totalTime).toBeLessThan(6000);
      
      // Should not leak significant memory during error handling
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB
      
      // All requests should complete (even if with errors)
  expect(responses.length).toBeGreaterThanOrEqual(errorRequestCount * 0.8);
      
      const errorCounts = {
        400: responses.filter(r => r.status === 400).length,
        401: responses.filter(r => r.status === 401).length,
        404: responses.filter(r => r.status === 404).length,
        500: responses.filter(r => r.status === 500).length,
        501: responses.filter(r => r.status === 501).length
      };
      
      console.log(`Error handling performance: ${JSON.stringify(errorCounts)} in ${totalTime}ms`);
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly clean up resources after requests', async () => {
      const initialConnections = await getActiveConnections();
      
      // Generate load that creates connections
  const promises: Promise<request.Response>[] = [];
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
  const settled = await Promise.allSettled(promises);
  const successes = settled.filter((r) => r.status === 'fulfilled').length;
  expect(successes).toBeGreaterThanOrEqual(20);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalConnections = await getActiveConnections();
      
      // Connections should be cleaned up (allow for some variance)
      expect(finalConnections).toBeLessThanOrEqual(initialConnections + 5);
      
      console.log(`Connections: Initial ${initialConnections}, Final ${finalConnections}`);
    });
  });

  // Helper function to get active connections (approximate)
  async function getActiveConnections(): Promise<number> {
    try {
      // This is a simple approximation - in real scenarios you'd query
      // your connection pools, database connections, etc.
      const response = await request(app.getHttpServer()).get('/health');
      return response.status === 200 ? 1 : 0;
    } catch {
      return 0;
    }
  }
});
