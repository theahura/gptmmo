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

  // Rollup will only resolve relative module IDs by default. This means that an
  // import statement like this…
  //
  // ```
  // import moment from 'moment';
  // ```
  //
  // ...won't result in moment being included in our bundle – instead, it will
  // be an external dependency that is required at runtime. Rollup warns us when
  // it finds non-relative packages so that we have the opportunity to
  // explicitly declare if the dependency should be bundled. Packages marked
  // here will not be included in the bundle. Instead we will install them using
  // `npm install`.
  //
  // See https://rollupjs.org/troubleshooting/#warning-treating-module-as-external-dependency
  external: ['chalk', 'fs', 'path', 'module'],

  plugins: [typescript()],
};
