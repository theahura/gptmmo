/**
 * This file is the entrypoint for out common ESLint configuration.
 *
 * See https://eslint.org/docs/latest/use/configure/configuration-files-new to
 * learn more about the syntax.
 *
 * Note: when adding new rules make sure to use their default names. This is
 * because eslint-config-prettier disables rules that conflict with prettier by
 * name, so if a conflicting rule is renamed then eslint-config-prettier won't
 * disable it. See
 * https://github.com/prettier/eslint-config-prettier#eslintconfigjs-flat-config-plugin-caveat
 */

const eslintConfigPrettier = require('eslint-config-prettier');

const ignores = require('./ignores.js');
const importOrder = require('./importOrder.js');
const jsdoc = require('./jsdoc.js');
const recommended = require('./recommended');
const gptmmo = require('./gptmmo.js');
const extensions = require('./utils/extensions.js');

module.exports = {
  default: [
    ...recommended,
    ...importOrder,
    ...jsdoc,
    ...gptmmo,
    ...ignores,

    // Turn off some of the recommended rules which we don't wish to use.
    {
      files: extensions.all,
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },

    // eslint.config.js files need to use `require` to include this package!
    {
      files: [
        '**/*.config.js',
        '**/*-config.js',
        '**/*.config.cjs',
        '**/*-config.cjs',
        '**/*.config.ts',
        '**/*-config.ts',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // Turn off rules that would conflict with Prettier. Note that this is
    // slightly brittle - it assumes that plugins have default names. See
    // https://github.com/prettier/eslint-config-prettier#eslintconfigjs-flat-config-plugin-caveat
    eslintConfigPrettier,
  ],
};
