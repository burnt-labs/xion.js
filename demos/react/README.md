# demos/react

Reference React demo for `@burnt-labs/abstraxion-react`. One representative
page per dashboard auth mode — enough to feel out the UX without a separate
route per feature.

## Stack

- Vite 7
- React 19
- Tailwind CSS 4 via `@tailwindcss/vite`
- React Router v7 (HashRouter-free; declared in `src/main.tsx`)
- `vite-plugin-node-polyfills` (Buffer/stream for CosmJS)
- TypeScript with the `@/` alias for `src/`
- `VITE_*` env vars (see `.env.example`)

## Pages

| Path         | Mode                                    | What it shows                                                                                            |
| ------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`          | —                                       | Navigation home                                                                                          |
| `/auto`      | `authentication: { type: "auto" }`      | Recommended dashboard mode — popup on desktop, redirect on mobile/PWA. Full state-machine debug panel, side-by-side session-key & direct signing (`requireAuth: true`), and manage-authenticators. Devs shouldn't pick popup or redirect explicitly anymore; both live behind auto. |
| `/embedded`  | `authentication: { type: "embedded" }`  | `<AbstraxionEmbed>` with a toggle between inline (always-visible) and dynamic (button + modal) presentations, plus session-key & direct signing. |
| `/signer-mode` | `authentication: { type: "signer" }`  | Signer chooser — Turnkey (silent signing) or MetaMask (per-tx popup). Each builds its own `getSignerConfig` and feeds the same Abstraxion smart-account flow. |

`@burnt-labs/ui` is intentionally not used — local demo primitives live in
`src/components/Button.tsx`. See [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md)
for the full restructure context.

## Develop

```bash
cp .env.example .env.local   # fill in chain config
pnpm install                  # from xion.js/ workspace root
pnpm --filter demos-react dev
```

`pnpm dev` runs Vite on port `3001`.

## Build

```bash
pnpm --filter demos-react build
pnpm --filter demos-react preview
pnpm --filter demos-react check-types
```
