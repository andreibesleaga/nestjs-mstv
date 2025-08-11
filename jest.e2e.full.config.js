module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/e2e/**/*.e2e.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.e2e.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
};
