/**
 * Rollup is a Javascript bundler: meaning that it can "bundle" a bunch of JS
 * files into a single group of files for deployment. This same role is filled
 * on the frontend using "webpack".
 */

const failOnWarning = require('@gptmmo/rollup-fail-on-warning');
const typescript = require('@rollup/plugin-typescript');
const copy = require('rollup-plugin-copy');
const dts = require('rollup-plugin-dts');

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
const EXTERNAL = [
  '@gptmmo/collections',
  '@gptmmo/status',
  '@gptmmo/lib',
  '@gptmmo/persistence',
  '@gptmmo/validation',
  '@gptmmo/server-environment',
  '@mux/mux-node',
  'ajv-formats',
  'ajv-keywords',
  'assert',
];

/**
 * This bundle coalesces all of our typescript files into a single JS ESM file
 * _AND_ emits declaration files (`*.d.ts`) for each typescript file.
 * Unfortunately, the typescript compiler provides no ability for us to also
 * bundle the declaration files at the same time and as a result we have a
 * partially built project after running this step: we have a fully bundled JS
 * binary but a not-bundled directory of declaration files. You'll find later
 * in this file another bundle config which bundles the declaration files.
 */
const jsBundle = {
  input: 'src/index.ts',
  output: {
    file: '.tmp/dist/index.js',
    format: 'es',
    sourcemap: 'inline',
  },

  external: EXTERNAL,

  onwarn: failOnWarning([
    {
      codes: ['UNRESOLVED_IMPORT'],
      reason:
        'external dependencies must be explicitly listed in the rollup ' +
        'config\'s "external" array',
    },
  ]),

  plugins: [
    typescript({
      compilerOptions: {
        // When building for prod we dont want to output a broken build, however
        // during development it's valuable to emit broken builds for the watch
        // binary to detect and log.
        noEmitOnError: process.env.NODE_ENV != 'development',
      },
    }),
  ],

  watch: {
    // Hot reloading at instant speed can cause port contention when doing large
    // find-and-replace operations or saving several times in succession. So we
    // add a small debounce timer.
    buildDelay: 500,

    // By default rollup watches node_modules, which is generally unnecessary
    // and can cause linux systems to run out of file watcher space in large
    // repos. Disable it.
    // See: https://github.com/rollup/rollup-watch/issues/22
    exclude: '^node_modules/(?!@gptmmo/).*',
  },
};

/**
 * Because typescript does not support bundling declaration (`*.d.ts`) files, we
 * use rollup to bundle the declaration files once they've ben emitted by our
 * JS bundle step.
 */
const dtsBundle = {
  input: '.tmp/dist/index.d.ts',
  output: {
    file: 'dist/index.d.ts',
    format: 'es',
  },

  external: EXTERNAL,

  onwarn: failOnWarning([
    {
      codes: ['UNRESOLVED_IMPORT'],
      reason:
        'external dependencies must be explicitly listed in the rollup ' +
        'config\'s "external" array',
    },
  ]),

  plugins: [
    dts.default({
      compilerOptions: {
        paths: {
          '@/*': ['.tmp/dist/*'],
        },
        include: ['.tmp/dist/**/*.d.ts'],
      },
    }),
    copy({
      targets: [{ src: '.tmp/dist/index.js', dest: 'dist' }],
    }),
  ],

  watch: {
    // Hot reloading at instant speed can cause port contention when doing large
    // find-and-replace operations or saving several times in succession. So we
    // add a small debounce timer.
    buildDelay: 500,

    // Because we're running two bundles each which can be watched, we need to
    // disable clearing the screen after the first watching to avoid clobbering
    // its output.
    clearScreen: false,

    // By default rollup watches node_modules, which is generally unnecessary
    // and can cause linux systems to run out of file watcher space in large
    // repos. Disable it.
    // See: https://github.com/rollup/rollup-watch/issues/22
    exclude: '^node_modules/(?!@gptmmo/).*',
  },
};

module.exports = [jsBundle, dtsBundle];
