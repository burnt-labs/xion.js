const path = require('path');

module.exports = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@burnt-labs/ui', '@burnt-labs/abstraxion', '@burnt-labs/abstraxion-core'],
  webpack: (config) => {
    // Ensure workspace packages are resolved correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@burnt-labs/abstraxion': path.resolve(__dirname, '../../packages/abstraxion'),
      '@burnt-labs/abstraxion-core': path.resolve(__dirname, '../../packages/abstraxion-core'),
      '@burnt-labs/constants': path.resolve(__dirname, '../../packages/constants'),
      '@burnt-labs/ui': path.resolve(__dirname, '../../packages/ui'),
    };
    return config;
  },
};
