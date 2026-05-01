# demos/svelte

Reference Vite + Svelte 5 demo for `@burnt-labs/abstraxion-js`. Shows how
non-React stacks can wire the framework-agnostic controller layer into their
own reactivity primitives.

## Stack

- Vite 7
- Svelte 5 (runes mode)
- `@burnt-labs/abstraxion-js` (controller layer, wired to Svelte stores)
- Tailwind CSS 4 via `@tailwindcss/vite`
- `vite-plugin-node-polyfills` (Buffer/stream for CosmJS)
- TypeScript with the `@/` alias for `src/`
- `VITE_*` env vars (see `.env.example`)

## The wrapper

[`src/lib/abstraxion.ts`](src/lib/abstraxion.ts) ships two layers — copy the
runtime, replace the binding:

| Layer | Purpose | Re-usable? |
| --- | --- | --- |
| `createAbstraxionRuntime(config, options?)` | Framework-agnostic. Returns `{ controller, getState, subscribe, login, logout, manageAuthenticators, createRequireSigningClient, … }`. | Vue, Solid, Lit, vanilla — anywhere you want. |
| `createAbstraxionStore(config, options?)` | Wraps the runtime in a Svelte `writable` + `derived` so components can `$store.isConnected`. | Svelte-specific. |

### Porting to Vue / Solid / vanilla

The runtime is the same; only the reactivity binding changes. Take the Svelte
binding as your template:

```ts
// Svelte (this template)
const stateStore = writable(runtime.getState());
runtime.subscribe((next) => stateStore.set(next));
```

```ts
// Vue 3
const state = ref(runtime.getState());
runtime.subscribe((next) => (state.value = next));
```

```ts
// Solid
const [state, setState] = createSignal(runtime.getState());
runtime.subscribe(setState);
```

```ts
// Vanilla
let state = runtime.getState();
runtime.subscribe((next) => {
  state = next;
  render();
});
```

The runtime also exposes `runtime.controller` as an escape hatch when you
need mode-specific APIs (e.g. `IframeController.setContainerElement` for
embedded mode, or `RedirectController.signResult.subscribe` for the post-
redirect direct-signing result).

## React parity

`@burnt-labs/abstraxion-react` ships a few hooks and a component that this
demo doesn't try to recreate beyond what `createAbstraxionStore` exposes.
Here's the gap and the equivalent on the JS side:

| React | Svelte / vanilla equivalent |
| --- | --- |
| `useAbstraxionAccount()` | `$store` (this template) — same field shape (`isConnected`, `granterAddress`, etc.) |
| `useAbstraxionClient()` (read-only `CosmWasmClient`) | `runtime.createReadClient()` — returns `Promise<CosmWasmClient>`. The React hook is literally `await CosmWasmClient.connect(rpcUrl)` plus a `useState` cell; the helper here is just the same call wrapped to discourage re-importing CosmJS in your app code. |
| `useAbstraxionSigningClient()` (session-key, gasless) | `$store.signingClient` (already in this template) |
| `useAbstraxionSigningClient({ requireAuth: true })` (any mode) | `runtime.createDirectSigningClient()` — `Promise<SigningClient \| undefined>`. Returns `RequireSigningClient` for popup/redirect/embedded, `AAClient` for signer mode (see [signer-mode wiring](#signer-mode-direct-signing-whats-actually-involved) below). |
| `useManageAuthenticators()` | `runtime.manageAuthenticators(granterAddress)` + `runtime.isManageAuthSupported` |
| `signResult` (post-redirect direct signing) | `redirectController.signResult.subscribe(cb)` — narrow `runtime.controller` to `RedirectController` first |
| `manageAuthResult` (post-redirect manage flow) | `redirectController.manageAuthResult.subscribe(cb)` — same pattern |
| `<AbstraxionEmbed>` (drop-in iframe component) | **Not provided.** You manually mount: `iframeController.setContainerElement(node)` (e.g. inside `onMount`), and read `iframeController.subscribeApproval(cb)` to toggle modal/inline visibility on signing requests |
| Auto-mode resolution | Automatic — `normalizeAbstraxionConfig` calls `resolveAutoAuth` regardless of framework |
| `isAwaitingApproval` (iframe mode, modal trigger) | `iframeController.subscribeApproval((flag) => …)` |

### Signer mode direct signing — what's actually involved

`runtime.createDirectSigningClient()` does all of this for you in signer
mode; the breakdown is here so you know what's happening when you reach for
the helper (or want to do it inline without the wrapper):

```ts
import {
  AAClient,
  AccountStateGuards,
  AUTHENTICATOR_TYPE,
  GasPrice,
  SignerController,
  createSignerFromSigningFunction,
} from "@burnt-labs/abstraxion-js";

// 1. Narrow the controller — getConnectionInfo only exists on SignerController.
if (!(runtime.controller instanceof SignerController)) {
  throw new Error("Direct signing wiring shown is for signer mode only.");
}

// 2. Make sure we're connected (granterAddress is only populated when so).
const state = runtime.controller.getState();
if (!AccountStateGuards.isConnected(state)) {
  throw new Error("Log in first.");
}

// 3. Pull the signing function + authenticator metadata.
//    `connectionInfo.signMessage(hexPayload) => Promise<hexSig>` is whatever
//    you returned from `getSignerConfig()` in your AbstraxionConfig — Turnkey,
//    MetaMask, Privy, a raw Eth wallet, etc.
const connectionInfo = runtime.controller.getConnectionInfo!();
const authenticatorType = connectionInfo.metadata
  ?.authenticatorType as keyof typeof AUTHENTICATOR_TYPE;
const authenticatorIndex =
  (connectionInfo.metadata?.authenticatorIndex as number) ?? 0;

// 4. Wrap the bare signMessage into a CosmJS-shaped Signer. This handles
//    the Cosmos<->Eth signature format conversion (eth_secp256k1, etc.).
const signer = createSignerFromSigningFunction({
  smartAccountAddress: state.account.granterAddress,
  authenticatorIndex,
  authenticatorType,
  signMessage: connectionInfo.signMessage,
});

// 5. Plug it into AAClient.connectWithSigner — same constructor CosmJS users
//    are familiar with.
const directClient = await AAClient.connectWithSigner(
  runtime.config.rpcUrl,
  signer,
  { gasPrice: GasPrice.fromString(runtime.config.gasPrice) },
);

// directClient.sendTokens(...), directClient.signAndBroadcast(...) — same
// surface as a regular CosmJS SigningCosmWasmClient.
```

Every primitive used here is exported from `@burnt-labs/abstraxion-js`. None
of it is React-coupled; it's just five steps of glue that the React hook
hides inside `useEffect`.

### Other gaps

1. **Embedded mode** still needs a small Svelte/Vue/etc. component that
   mounts a container `<div>`, calls `iframeController.setContainerElement`
   on it, and subscribes to `iframeController.subscribeApproval` to toggle
   modal/inline visibility on signing requests. The iframe protocol is
   framework-agnostic; only the host element wiring is per-framework.
2. **`signResult` / `manageAuthResult` after a redirect** — narrow
   `runtime.controller` to `RedirectController` and call
   `controller.signResult.subscribe(cb)` /
   `controller.manageAuthResult.subscribe(cb)`. Same pattern as the React
   `useSyncExternalStore` wiring.

## Develop

```bash
cp .env.example .env.local
pnpm install                  # from xion.js/ workspace root
pnpm --filter demos-svelte dev
```

Vite serves on port `3002`.

## Build & check

```bash
pnpm --filter demos-svelte build
pnpm --filter demos-svelte preview
pnpm --filter demos-svelte check
```
