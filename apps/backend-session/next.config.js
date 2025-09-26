/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  eslint: {
    // Only run ESLint on pages and API routes during build
    dirs: ['src/app', 'src/lib'],
  },
}

module.exports = nextConfig
