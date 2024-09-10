/**
 * Rollup is a Javascript bundler: meaning that it can "bundle" a bunch of JS
 * files into a single group of files for deployment. This same role is filled
 * on the frontend using "webpack".
 *
 * In the case of this binary, we're writing Typescript in ESM whereas node
 * expects Javascript as CommonJS. This config translates from ESM Typescript to
 * Javascript CommonJS.
 */

const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
    sourcemap: 'inline',
  },

  plugins: [typescript()],
};
