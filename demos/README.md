# demos/

Reference apps for the Abstraxion SDK, one per target framework. All demos are client-side and avoid server-side languages — the goal is for each one to work as a pure consumer of the published packages.

| Demo | Stack | SDK package |
| --- | --- | --- |
| [`react/`](./react) | Vite + React 18 + Tailwind 4 + TanStack Router (file-based) | `@burnt-labs/abstraxion-react` |
| [`react-native/`](./react-native) | Expo SDK 52 + React Native 0.76 + Expo Router | `@burnt-labs/abstraxion-react-native` |
| [`svelte/`](./svelte) | Vite + Svelte 5 + Tailwind 4 | `@burnt-labs/abstraxion-js` |
| [`node/`](./node) | Node.js + tsx (placeholder) | `@burnt-labs/abstraxion-js` |

The `demos/react` demo replaces `apps/demo-app` (Next.js) — see commit 10 of [`abstraxion_package_restructure.md`](../../.docs/tasks/abstraxion_package_restructure.md) for the cleanup step.

## Routing convention

The two web demos use file-based routing so adding a scenario means creating a single file:

- `demos/react/src/routes/<name>.tsx` — TanStack Router via `@tanstack/router-plugin/vite`
- `demos/react-native/src/app/<name>.tsx` — Expo Router

`demos/svelte` uses a single root component for now — if it grows, switch to `@sveltejs/vite-plugin-svelte` + a small file-based router. Don't add SvelteKit; it would pull in a server runtime we don't want.

## Workspace integration

Each demo is a pnpm workspace package and is picked up by Turbo automatically (`demos/*` in `pnpm-workspace.yaml`). Filter into a single demo with `pnpm --filter demos-<name> <script>`.
