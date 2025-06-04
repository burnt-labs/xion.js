# Xion.js Demo App

This is a Next.js demo application showcasing the Abstraxion wallet integration and Xion blockchain interactions.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account (for deployment)
- Wrangler CLI (installed as a dev dependency)

### Development

First, install dependencies from the monorepo root:

```bash
pnpm install
```

Then run the development server:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Deployment to Cloudflare Workers

This app is configured to deploy to Cloudflare Workers using OpenNext.js.

### Setup R2 Bucket (First Time Only)

1. Log in to your Cloudflare dashboard
2. Navigate to R2 Storage
3. Create a new bucket named `xion-demo-app-cache`
4. Note: The bucket name must match the one in `wrangler.jsonc`

### Environment Variables

Create a `.dev.vars` file for local development (this file is gitignored):

```env
NEXTJS_ENV=development
# Add any other environment variables here
```

For production, set environment variables in the Cloudflare dashboard:
1. Go to Workers & Pages > your worker > Settings > Variables
2. Add your environment variables

### Available Scripts

```bash
# Preview the worker locally (builds and runs on local Cloudflare runtime)
pnpm preview

# Deploy to Cloudflare Workers
pnpm deploy

# Build and upload without publishing (useful for CI/CD)
pnpm upload

# Generate TypeScript types for Cloudflare environment
pnpm cf-typegen
```

### Deployment Process

1. **Preview locally** (recommended before deploying):
   ```bash
   pnpm preview
   ```
   This builds the app and runs it using Wrangler's local runtime.

2. **Deploy to production**:
   ```bash
   pnpm deploy
   ```
   This builds and deploys your app to Cloudflare Workers.

### Configuration Files

- `wrangler.jsonc` - Cloudflare Workers configuration
- `open-next.config.ts` - OpenNext.js configuration for Cloudflare
- `worker-configuration.d.ts` - Generated TypeScript types for Worker environment

## API Routes

To create [API routes](https://nextjs.org/docs/app/building-your-application/routing/router-handlers) add an `api/` directory to the `app/` directory with a `route.ts` file. For individual endpoints, create a subfolder in the `api` directory, like `api/hello/route.ts` would map to [http://localhost:3001/api/hello](http://localhost:3001/api/hello).

## Learn More

- [Abstraxion Documentation](https://docs.burnt.com/abstraxion) - Learn about wallet abstraction
- [Xion Documentation](https://docs.burnt.com) - Learn about the Xion blockchain
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Learn about Cloudflare Workers
- [OpenNext.js](https://opennext.js.org/) - Learn about deploying Next.js to edge runtimes
