const configs = require('./src');

module.exports = [
  ...configs.eslint,

  // This repository needs `require` because it's defining node files which
  // configure eslint.
  {
    files: ['src/**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
