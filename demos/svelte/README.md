# demos/svelte

Vite + Svelte 5 demo for `@burnt-labs/abstraxion-js`. No React. No SvelteKit (server-side).

## Stack

- Vite 6
- Svelte 5
- `@burnt-labs/abstraxion-js` (controller layer, wired to Svelte stores)
- Tailwind CSS 4 via `@tailwindcss/vite`
- TypeScript
- `@/` path alias for `src/`
- `VITE_*` env conventions (see `.env.example`)

## Why no SvelteKit

The whole point is to keep the demo client-side and equivalent in scope to `demos/react`. SvelteKit is a server-side framework — overkill, and would obscure the integration story. Plain Vite + Svelte is the reference for non-React consumers.

## Develop

```bash
cp .env.example .env.local
pnpm install                  # from xion.js/ workspace root
pnpm --filter demos-svelte dev
```

Vite serves on port `3002`.

## Status

Scaffold only. The reference Svelte ↔ controller wiring (mapping `createController()` state to `writable` stores) lands in commit 9 of [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md).

## Build

```bash
pnpm --filter demos-svelte build
pnpm --filter demos-svelte preview
```
