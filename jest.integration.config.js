
module.exports = {
  ...require('./jest.config.js'),
  testMatch: [
    '**/test/**/*.integration.spec.ts',
    '**/*.integration.spec.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.integration.ts'],
  testTimeout: 60000
};
