import 'reflect-metadata';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-e2e';
  process.env.REDIS_URL = 'redis://localhost:6379';
  // Don't set DATABASE_URL to avoid Prisma connection attempts
});

afterAll(async () => {
  // Cleanup
});
