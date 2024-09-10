// TODO(hunter): this file is copied from `packages/ui` and we should converge
// the configs.

module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  plugins: [
    'babel-plugin-transform-import-meta',
    [
      '@babel/plugin-transform-runtime',
      {
        useESModules: true,
      },
    ],
  ],
};
