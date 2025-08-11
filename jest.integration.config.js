
module.exports = {
  ...require('./jest.config.js'),
  testMatch: [
    '**/test/integration/**/*.integration.spec.ts',
    '**/test/**/*.integration.spec.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.integration.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
  forceExit: true
};
