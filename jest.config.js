module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/modules', '<rootDir>/apps', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.(test|spec).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    'modules/**/*.ts',
    'apps/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/packages/auth/src/$1',
    '^@users/(.*)$': '<rootDir>/modules/users/src/$1',
    '^@messaging/(.*)$': '<rootDir>/packages/messaging/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  verbose: true
};
