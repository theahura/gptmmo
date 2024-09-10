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
