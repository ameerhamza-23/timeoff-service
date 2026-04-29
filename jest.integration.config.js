module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: { '@libs/(.*)': '<rootDir>/libs/$1' },
  globalSetup: '<rootDir>/test/mock-hcm/setup.ts',
  globalTeardown: '<rootDir>/test/mock-hcm/teardown.ts',
};
