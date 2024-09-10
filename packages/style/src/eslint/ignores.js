/**
 * Ignores common files which should not be linted.
 */

module.exports = [
  {
    ignores: ['**/dist', '.rollup.cache', '.tmp', 'node_modules', 'out'],
  },
];
