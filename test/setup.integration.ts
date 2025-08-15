import 'reflect-metadata';

beforeAll(async () => {
  // Setup test environment without real database connections
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TYPE = 'postgresql';
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Skip actual database setup for integration tests since we're using mocks
  console.log('Integration test environment setup complete with mocked services');
});

beforeEach(async () => {
  // No database cleanup needed for mocked tests
});

afterAll(async () => {
  // No cleanup needed for mocked tests
  console.log('Integration test cleanup complete');
});
