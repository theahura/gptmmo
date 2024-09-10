const mongoPreset = require('@shelf/jest-mongodb/jest-preset');
const merge = require('merge');

// By default we don't transpile node_modules during testing. However, some
// packages require transpiling into ESM. Here you can add regex matchers to
// describe which packages need to be transformed.
const nodeModulesToTransform = [
  '@babel/',
  'mongodb/src',
  'node-fetch',
  'uuid/dist',
];

module.exports = merge.recursive(mongoPreset, {
  verbose: true,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest',
  },
  testPathIgnorePatterns: ['.rollup.cache', 'dist'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
    extensionsToTreatAsEsm: ['.ts', '.js'],
  },

  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
  },

  transformIgnorePatterns: [
    `node_modules/(?!${nodeModulesToTransform.join('|')}).+`,
    'jest-mongodb-config.js',
  ],
});
