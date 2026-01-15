# xion.js

Official XION JavaScript SDK monorepo.

## Packages

- `abstraxion`: Account abstraction React package for XION
- `abstraxion-core`: Core account abstraction logic
- `abstraxion-react-native`: React Native support for account abstraction
- `account-management`: Account management utilities
- `signers`: Account abstraction signers and Cryptographic utillities built on CosmJS
- `constants`: Shared constants
- `ui`: React component library with Tailwind CSS

## Apps

- `demo-app`: Next.js demo application

## Development

```bash
pnpm dev      # Start all packages in dev mode
pnpm build    # Build all packages
pnpm lint     # Lint code
pnpm format   # Format code
pnpm test     # Run tests
```

## Publishing

```bash
pnpm changeset          # Create a changeset
pnpm version:packages   # Version packages
pnpm publish:packages   # Publish to npm
```

Built with [Turborepo](https://turbo.build/repo), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).
