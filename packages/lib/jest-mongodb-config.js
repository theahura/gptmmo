/**
 * For tests which rely on MongoDB, we start an in-memory MongoDB server using
 * the following config.
 *
 * See https://github.com/shelfio/jest-mongodb
 */
module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '4.4.21',
      skipMD5: true,
    },
    autoStart: false,
    instance: {},
  },
};
