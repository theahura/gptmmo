/**
 * Rollup is a Javascript bundler: meaning that it can "bundle" a bunch of JS
 * files into a single group of files for deployment. This same role is filled
 * on the frontend using "webpack".
 */

const generatePackageJson = require('@gptmmo/rollup-plugin-generate-package-json');
const failOnWarning = require('@gptmmo/rollup-fail-on-warning');
const nodeResolve = require('@rollup/plugin-node-resolve');
const run = require('@rollup/plugin-run');
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
const EXTERNAL = ['together-ai', 'assert'];

const nodeResolvePlugin = nodeResolve({
  // We deeply bundle all shared gptmmo modules.
  resolveOnly: [/^@gptmmo\//],
});

/**
 * Creates a list of plugins to be used when hot-reloading the binary generated
 * by this rollup config.
 *
 * @returns An array of plugins.
 */
const createHotReloadPlugins = () => [run()];

/**
 * Creates a list of plugins to be used when building a deployable binary. This
 * plugins differ from those used by `createHotReloadPlugins` in that we can
 * often skip productionization plugins when hot reloading a local server.
 *
 * @returns An array of plugins.
 */
const createBuildPlugins = () => {
  return [
    copy({
      targets: [{ src: 'Dockerfile', dest: 'dist/' }],
    }),
    generatePackageJson({ nodeResolvePlugin }),
  ];
};

module.exports = [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'cjs',
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
      nodeResolvePlugin,
      typescript({
        outputToFilesystem: false,
        compilerOptions: {
          // When building for prod we dont want to output a broken build, however
          // during development it's valuable to emit broken builds for the watch
          // binary to detect and log.
          noEmitOnError: process.env.NODE_ENV != 'development',
        },
      }),
      process.env.NODE_ENV === 'development'
        ? createHotReloadPlugins()
        : createBuildPlugins(),
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
  },
];
