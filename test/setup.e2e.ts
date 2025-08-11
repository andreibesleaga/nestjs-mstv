import 'reflect-metadata';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test-e2e.db';
  process.env.JWT_SECRET = 'test-jwt-secret-e2e';
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Initialize Prisma client for tests
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Run migrations for test database
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'pipe',
    });
  } catch {
    console.warn('Migration failed, continuing with existing schema');
  }

  await prisma.$connect();
});

beforeEach(async () => {
  // Clean database before each test
  const deleteUsers = prisma.user.deleteMany();
  const deleteRefreshTokens = prisma.refreshToken.deleteMany();

  await prisma.$transaction([deleteRefreshTokens, deleteUsers]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Export for use in e2e tests
export { prisma };
