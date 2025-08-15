// Global test setup
import 'reflect-metadata';

// Mock Prisma Client globally
jest.mock('@prisma/client', () => {
  // Store created users in memory for test session
  const createdUsers = new Map();
  let userCounter = 1;

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) {
          const user = createdUsers.get(where.email);
          return Promise.resolve(user || null);
        }
        if (where.id) {
          const user = Array.from(createdUsers.values()).find((u) => u.id === where.id);
          return Promise.resolve(user || null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = {
          id: `123e4567-e89b-12d3-a456-42661417400${userCounter}`, // Generate UUID-like ID
          email: data.email,
          name: data.name,
          password: data.password,
          role: data.role || 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        userCounter++;
        createdUsers.set(data.email, newUser);
        return Promise.resolve(newUser);
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(createdUsers.values()));
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const user =
          createdUsers.get(where.email) ||
          Array.from(createdUsers.values()).find((u) => u.id === where.id);
        if (user) {
          const updatedUser = { ...user, ...data, updatedAt: new Date() };
          createdUsers.set(user.email, updatedUser);
          return Promise.resolve(updatedUser);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        const user =
          createdUsers.get(where.email) ||
          Array.from(createdUsers.values()).find((u) => u.id === where.id);
        if (user) {
          createdUsers.delete(user.email);
          return Promise.resolve(user);
        }
        return Promise.resolve(null);
      }),
    },
    refreshToken: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'token' + Date.now(),
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        })
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.token) {
          return Promise.resolve({
            id: 'token123',
            token: where.token,
            userId: '1',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            user: Array.from(createdUsers.values())[0] || null,
          });
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.token) {
          return Promise.resolve({
            id: 'token123',
            token: where.token,
            userId: '1',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            user: Array.from(createdUsers.values())[0] || null,
          });
        }
        return Promise.resolve(null);
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $disconnect: jest.fn(),
  };

  return { PrismaClient: jest.fn(() => mockPrisma) };
});

beforeAll(async () => {
  // Setup global test configuration
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock external services for unit tests
jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    producer: jest.fn(() => ({
      connect: jest.fn(),
      send: jest.fn(),
      disconnect: jest.fn(),
    })),
    consumer: jest.fn(() => ({
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn(),
    })),
  })),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn(() => ({
    close: jest.fn(),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  }));
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockImplementation((plaintext, _hash) => {
    // Mock password comparison - return true only for expected passwords
    return Promise.resolve(plaintext === 'password123');
  }),
}));
