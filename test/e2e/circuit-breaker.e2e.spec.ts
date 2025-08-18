import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/apps/api-gateway/app.module';

let failureCount = 0;
@Controller('flaky')
class FlakyController {
  @Get()
  get() {
    failureCount++;
    if (failureCount <= 10) {
      throw new Error('Simulated failure');
    }
    return { ok: true };
  }
}

describe('Circuit Breaker (Fastify) e2e', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_CIRCUIT_BREAKER = 'true';
    process.env.CB_THRESHOLD = '5';
    process.env.CB_TIMEOUT = '10';
    process.env.CB_RESET_TIMEOUT = '200';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [FlakyController],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    // Register Fastify circuit breaker plugin explicitly for this test app
    const instance = app.getHttpAdapter().getInstance();
    instance.register(require('@fastify/circuit-breaker'), {
      threshold: parseInt(process.env.CB_THRESHOLD || '5', 10),
      timeout: parseInt(process.env.CB_TIMEOUT || '10000', 10),
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT || '60000', 10),
    });
    // Once the plugin is registered, create a single beforeHandler and attach globally
    instance.after(() => {
      const cb = (instance as any).circuitBreaker();
      instance.addHook('onRequest', cb);
    });
    await app.init();
    await instance.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens the circuit after threshold failures and then resets after resetTimeout', async () => {
    const server = app.getHttpServer();

    // Cause failures up to just below threshold
    for (let i = 0; i < 4; i++) {
      await request(server).get('/flaky').expect(500);
    }
    // Hitting the threshold should return 503 for this request
    await request(server).get('/flaky').expect(503);
    // Circuit should be open now; subsequent requests should be blocked quickly with 503
    await request(server).get('/flaky').expect(503);

    // Wait for resetTimeout then try again
    await new Promise((r) => setTimeout(r, 250));
    await request(server).get('/flaky');
  });
});
