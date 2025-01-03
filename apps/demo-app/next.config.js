/** @type {import('next').NextConfig} */
const webpack = require("webpack");

module.exports = {
  reactStrictMode: true,
  transpilePackages: [
    "@burnt-labs/abstraxion",
    "@burnt-labs/abstraxion-core",
    "@burnt-labs/signers",
    "@keplr-wallet/crypto",
    "tough-cookie",
    "fetch-cookie",
    "starknet",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill node: protocol imports
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );

      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          url: require.resolve("url/"),
          crypto: require.resolve("crypto-browserify"),
          stream: require.resolve("stream-browserify"),
          buffer: require.resolve("buffer/"),
          util: require.resolve("util/"),
          http: require.resolve("stream-http"),
          https: require.resolve("https-browserify"),
        },
      };
    }
    return config;
  },
};
