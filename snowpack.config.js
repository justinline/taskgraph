// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: ['@snowpack/plugin-typescript'],
  devOptions: {
    port: 8080,
  },
  buildOptions: {
    out: "dist",
    sourcemap: true,
    baseUrl: '/taskgraph'
  },
};
