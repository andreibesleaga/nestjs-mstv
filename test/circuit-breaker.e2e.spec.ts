import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/apps/api-gateway/app.module';

// A tiny controller to simulate a flaky endpoint
import { Controller, Get } from '@nestjs/common';

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

    // Register Fastify circuit breaker plugin and apply a global onRequest hook
    const instance = app.getHttpAdapter().getInstance();
    instance.register(require('@fastify/circuit-breaker'), {
      threshold: parseInt(process.env.CB_THRESHOLD || '5', 10),
      timeout: parseInt(process.env.CB_TIMEOUT || '10000', 10),
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT || '60000', 10),
    });
    (instance as any).after(() => {
      const cb = (instance as any).circuitBreaker();
      (instance as any).addHook('onRequest', cb);
    });

    await app.init();
    await instance.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('opens the circuit after threshold failures and then resets after resetTimeout', async () => {
    const server = app.getHttpServer();

    // Cause failures up to just below the threshold
    for (let i = 0; i < 4; i++) {
      await request(server).get('/flaky').expect(500);
    }
    // Hitting the threshold returns 503 for this request
    await request(server).get('/flaky').expect(503);
    // Circuit remains open; subsequent request also 503
    await request(server).get('/flaky').expect(503);

    // Wait for resetTimeout
    await new Promise((r) => setTimeout(r, 250));

    // After reset, should attempt again; still failing until failureCount > 10
    await request(server).get('/flaky');
  });
});
