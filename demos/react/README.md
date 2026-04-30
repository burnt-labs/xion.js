# demos/react

Vite + React + Tailwind 4 + [TanStack Router](https://tanstack.com/router) demo for `@burnt-labs/abstraxion-react`.

## Why TanStack Router

File-based routing — drop a new file into `src/routes/` and it shows up as a page. No central `<Routes>` table to keep in sync. Per-route `__root.tsx` style layouts replace what used to be Next.js `layout.tsx` files.

## Stack

- Vite 6
- React 18 (matches the workspace `pnpm.overrides`; the package plan calls for React 19, follow-up tracked in [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md))
- Tailwind CSS 4 via `@tailwindcss/vite`
- TanStack Router (file-based, generated route tree)
- TypeScript
- `@/` path alias for `src/`
- `VITE_*` env conventions (see `.env.example`)

No server-side language. Everything is client-side, deployed as static assets.

## Develop

```bash
cp .env.example .env.local   # fill in chain config
pnpm install                  # from xion.js/ workspace root
pnpm --filter demos-react dev
```

`pnpm dev` runs Vite on port `3001`. The TanStack Router Vite plugin regenerates `src/routeTree.gen.ts` automatically as you add or rename files in `src/routes/`.

## Adding a page

Create `src/routes/<name>.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/<name>")({
  component: MyPage,
});

function MyPage(): JSX.Element {
  return <div>Hello</div>;
}
```

The plugin will append it to the generated route tree on the next build.

## Build

```bash
pnpm --filter demos-react build
pnpm --filter demos-react preview
```
