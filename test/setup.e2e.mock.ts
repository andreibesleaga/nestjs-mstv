import 'reflect-metadata';

// Store created users in memory for test session
const createdUsers = new Map();
let userCounter = 1;

// Create mock Prisma client implementation
const mockPrismaClient = {
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
      // Check if user already exists
      if (createdUsers.has(data.email)) {
        const error = new Error('Unique constraint violation') as any;
        error.code = 'P2002';
        error.meta = { target: ['email'] };
        return Promise.reject(error);
      }

      const newUser = {
        id: `123e4567-e89b-12d3-a456-42661417400${userCounter}`, // Generate UUID-like ID
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role || (userCounter === 1 ? 'admin' : 'user'), // First user gets admin role
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
    count: jest.fn().mockImplementation(() => {
      return Promise.resolve(createdUsers.size);
    }),
    createMany: jest.fn().mockImplementation(({ data }) => {
      const created = data.map((userData) => {
        userCounter++;
        const newUser = {
          id: userCounter.toString(),
          email: userData.email,
          name: userData.name,
          password: userData.password,
          role: userData.role || 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        createdUsers.set(userData.email, newUser);
        return newUser;
      });
      return Promise.resolve({ count: created.length });
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
          user: createdUsers.get('test@example.com') || null,
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
  $connect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn().mockImplementation((callback) => {
    // Provide a transaction context with the same API
    return Promise.resolve(callback(mockPrismaClient));
  }),
  $queryRaw: jest.fn().mockImplementation((query) => {
    // Mock common database queries
    if (typeof query === 'string' || query?.strings) {
      const queryStr = typeof query === 'string' ? query : query.strings.join('');

      if (queryStr.includes('SELECT 1')) {
        return Promise.resolve([{ result: 1 }]);
      }
      if (queryStr.includes('DELETE FROM users')) {
        return Promise.resolve({ count: 0 });
      }
      if (queryStr.includes('SELECT version()')) {
        return Promise.resolve([{ version: 'PostgreSQL 14.0 (Mock)' }]);
      }
    }
    return Promise.resolve([]);
  }),
  $executeRaw: jest.fn().mockImplementation(() => Promise.resolve(0)),
};

// Mock @prisma/client to return our mock client
jest.mock('@prisma/client', () => {
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

// Mock external services
jest.mock('ioredis', () => {
  return jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn(),
  }));
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockImplementation((plaintext, _hash) => {
    // Mock password comparison - return true for common test passwords
    const validPasswords = ['password123', 'TestPassword123!', 'test123', 'Password123!'];
    return Promise.resolve(validPasswords.includes(plaintext));
  }),
}));

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-e2e';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
});

afterAll(async () => {
  // Cleanup
  createdUsers.clear();
});
