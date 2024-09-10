module.exports = {
  verbose: true,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest',
  },
  testPathIgnorePatterns: ['.rollup.cache', '.tmp', 'dist'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
    extensionsToTreatAsEsm: ['.ts', '.js'],
  },

  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
  },
};
