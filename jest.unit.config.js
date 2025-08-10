
module.exports = {
  ...require('./jest.config.js'),
  testMatch: [
    '**/*.unit.spec.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/test/integration/'
  ]
};
