const eslint = require('./eslint');

module.exports = {
  eslint: eslint.default,
  prettier: require('./prettier'),
};
