# xion.js

Official XION JavaScript SDK monorepo.

## Packages

- `abstraxion-js`: Framework-agnostic account abstraction controller layer for XION
- `abstraxion-react`: Thin React wrapper (provider, hooks, iframe embed) on top of `abstraxion-js`
- `abstraxion-react-native`: React Native wrapper on top of `abstraxion-js`
- `abstraxion-core`: Core account abstraction primitives (auth, dashboard protocol)
- `account-management`: Account management orchestrator and grant state
- `signers`: Account abstraction signers and cryptographic utilities built on CosmJS
- `constants`: Shared constants

`@burnt-labs/ui` is deprecated and not supported in v1.0.0 — its source has been removed from the active workspace. The legacy `<Abstraxion>` modal is superseded by `AbstraxionEmbed` in `@burnt-labs/abstraxion-react`.

## Demos

- `demos/react`: Vite + React demo (replaces the previous `apps/demo-app` Next.js demo)
- `demos/react-native`: Expo + React Native demo
- `demos/svelte`: Vite + Svelte demo wired directly against `abstraxion-js`
- `demos/node`: Node.js placeholder

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
