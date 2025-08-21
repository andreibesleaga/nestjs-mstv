import 'reflect-metadata';

// Real E2E setup: do NOT mock Prisma or external clients
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-e2e-real';

  // Point to services from docker/docker-compose.full.yml exposed on localhost
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:6432/dev?pgbouncer=true';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
  process.env.MONGODB_URL =
    process.env.MONGODB_URL || 'mongodb://dev:dev@localhost:27017/nestjs-app?authSource=admin';
  process.env.ENABLE_DISTRIBUTED_TRACING = process.env.ENABLE_DISTRIBUTED_TRACING || 'false';
});

afterAll(async () => {
  // no-op
});
