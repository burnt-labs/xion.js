# xion.js

Official XION JavaScript SDK monorepo.

## Packages

| Package                                                         | What it is                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`@burnt-labs/abstraxion-js`](packages/abstraxion-js)           | Framework-agnostic runtime: controllers, strategies, `createAbstraxionRuntime`. Use directly from Svelte/Vue/JS. |
| [`@burnt-labs/abstraxion-react`](packages/abstraxion-react)     | React wrapper — provider, hooks, `<AbstraxionEmbed>`. Built on `abstraxion-js`.                                  |
| [`@burnt-labs/abstraxion-react-native`](packages/abstraxion-react-native) | React Native wrapper — same hook surface, with RN strategies and in-app `<WebView>` embed.            |
| [`@burnt-labs/abstraxion-core`](packages/abstraxion-core)       | Connector layer (Cosmos / Ethereum / external signers) and the SDK ↔ Dashboard iframe message protocol.          |
| [`@burnt-labs/account-management`](packages/account-management) | Orchestrator: session restoration, account discovery/creation, grant state.                                       |
| [`@burnt-labs/signers`](packages/signers)                       | CosmJS-based signers and cryptographic utilities for Abstraxion accounts.                                         |
| [`@burnt-labs/constants`](packages/constants)                   | Shared chain IDs, RPC URLs, dashboard URLs, denoms.                                                              |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the layers fit together.

### Removed in v1

These packages have been removed from the active workspace and will not be published in the v1 line:

- **`@burnt-labs/abstraxion`** — renamed to [`@burnt-labs/abstraxion-react`](packages/abstraxion-react). Same React wrapper; npm name only. See the package's README for the migration note.
- **`@burnt-labs/ui`** — deprecated. The legacy `<Abstraxion>` modal it powered is superseded by `<AbstraxionEmbed>` in `@burnt-labs/abstraxion-react`. Last published version is `@burnt-labs/ui@1.0.0-alpha.26`.
- **`@burnt-labs/tailwind-config`**, **`@burnt-labs/tsconfig`**, **`@burnt-labs/eslint-config-custom`** — workspace ergonomics only, never load-bearing for external consumers. Consumers that extended these should switch to standard configs (e.g. `@vercel/style-guide`, `@tsconfig/*`).

## Quick start

### React (web)

```bash
npm i @burnt-labs/abstraxion-react
```

```tsx
import {
  AbstraxionProvider,
  AbstraxionEmbed,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion-react";

const config = {
  treasury: "xion1...",
  authentication: { type: "auto" }, // popup on desktop, redirect on mobile
};

export default function App() {
  return (
    <AbstraxionProvider config={config}>
      <AbstraxionEmbed />
      <Account />
    </AbstraxionProvider>
  );
}
```

### React Native (Expo)

```bash
npm i @burnt-labs/abstraxion-react-native \
      @react-native-async-storage/async-storage \
      expo-web-browser expo-linking
# embedded mode only:
npm i react-native-webview
```

### Other framework (Svelte / Vue / vanilla JS)

```bash
npm i @burnt-labs/abstraxion-js
```

```ts
import { createAbstraxionRuntime } from "@burnt-labs/abstraxion-js";

const runtime = createAbstraxionRuntime(config);
runtime.subscribe((state) => {
  /* mirror state into your framework's reactivity primitive */
});
await runtime.login();
```

See [`demos/svelte/`](demos/svelte) for a worked example.

## Demos

- [`demos/react`](demos/react) — Vite + React (replaces the previous `apps/demo-app` Next.js demo)
- [`demos/react-native`](demos/react-native) — Expo + React Native; redirect and embedded modes
- [`demos/svelte`](demos/svelte) — Vite + Svelte wired directly against `abstraxion-js`
- [`demos/node`](demos/node) — Node.js placeholder

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
