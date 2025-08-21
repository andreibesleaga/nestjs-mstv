import 'reflect-metadata';

beforeAll(async () => {
  // Setup test environment for integration tests with proper mocked services
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TYPE = 'postgresql';
  // Use localhost ports mapped from docker containers
  process.env.DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev';
  process.env.JWT_SECRET = 'test-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';

  console.log('Integration test environment setup complete with mocked services');
});

beforeEach(async () => {
  // No database cleanup needed for mocked tests
});

afterAll(async () => {
  console.log('Integration test cleanup complete');
});
