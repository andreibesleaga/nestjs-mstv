import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/apps/api-gateway/src/app.module';

describe('Performance Tests', () => {
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

  it('should handle concurrent registrations', async () => {
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `user${i}@example.com`,
            password: 'password123',
            name: `User ${i}`,
          })
      );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Concurrent registrations took ${duration}ms`);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    expect(successful).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle rapid GraphQL queries', async () => {
    const query = `
      query {
        users {
          id
          email
          name
        }
      }
    `;

    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < 20; i++) {
      promises.push(request(app.getHttpServer()).post('/graphql').send({ query }));
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Rapid GraphQL queries took ${duration}ms`);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    expect(successful).toBe(20);
    expect(duration).toBeLessThan(3000);
  });
});
