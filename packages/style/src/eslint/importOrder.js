/**
 * ESLint flat config describing our desired import order.
 *
 * See https://docs.google.com/document/d/1h0fZ3s0mhc6ulXmHRB7RrsTN6p9_IoYuH99JWenLirI/edit#heading=h.jbzuwoglhga4
 */

const importPlugin = require('eslint-plugin-import');

const extensions = require('./utils/extensions.js');

module.exports = [
  {
    files: extensions.all,
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
    settings: {
      'import/external-module-folders': ['node_modules'],
      'import/resolver': {
        typescript: {},
      },
    },
  },
];
