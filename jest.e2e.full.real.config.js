module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/test/e2e/**/*.e2e.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.e2e.real.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  forceExit: true,
};
