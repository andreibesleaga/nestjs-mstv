import 'reflect-metadata';

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TYPE = 'postgresql';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Mock external services
  jest.mock('@prisma/client');
  jest.mock('ioredis');
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('Test Setup', () => {
  it('should have correct environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
  });
});
