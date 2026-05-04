# @burnt-labs/abstraxion-js

The framework-agnostic runtime for XION account abstraction. Owns the per-mode auth state machine, controllers, strategies, and signing clients — with no React, no DOM, and no platform assumptions baked in.

You only need to depend on this package directly if you are:

- Building a non-React/RN integration (Svelte, Vue, SolidJS, vanilla JS)
- Implementing a custom host (e.g. an Electron preload, a service worker, a test harness) that needs to inject its own storage / redirect / iframe-transport behavior
- Writing a new framework wrapper sibling to [`@burnt-labs/abstraxion-react`](../abstraxion-react) or [`@burnt-labs/abstraxion-react-native`](../abstraxion-react-native)

If you are building a **React app**, use [`@burnt-labs/abstraxion-react`](../abstraxion-react). If you are building a **React Native app**, use [`@burnt-labs/abstraxion-react-native`](../abstraxion-react-native). Both wrappers re-export the relevant pieces of this runtime, so you rarely need to import from `abstraxion-js` directly.

## Installation

```bash
npm i @burnt-labs/abstraxion-js
```

## The runtime

`createAbstraxionRuntime(config, strategies?)` is the single entry point. It returns a `runtime` object that owns one controller at a time (the one matching `config.authentication.type`) and exposes a small reactive API:

```ts
import { createAbstraxionRuntime } from "@burnt-labs/abstraxion-js";

const runtime = createAbstraxionRuntime({
  treasury: "xion1...",
  authentication: { type: "auto" },
});

const unsubscribe = runtime.subscribe((state) => {
  // state.isConnected, state.isConnecting, state.granterAddress, state.error, ...
});

await runtime.login();
const snapshot = runtime.getState();
await runtime.logout();
unsubscribe();
```

That's the entire surface a host framework needs to bind to. React's `useSyncExternalStore`, a Svelte `readable` store, a Vue `ref` — all are thin adapters around `runtime.subscribe(listener) → unsubscribe` plus `runtime.getState()`.

## Authentication modes

The `authentication` field of the config picks the controller:

| Mode       | Controller          | What it does                                                                |
| ---------- | ------------------- | --------------------------------------------------------------------------- |
| `popup`    | `PopupController`   | Opens the dashboard in a popup window; communicates via `postMessage`.      |
| `redirect` | `RedirectController` | Full-page redirect to the dashboard; returns to a callback URL.            |
| `iframe`   | `IframeController`  | Renders the dashboard in an embedded iframe; communicates via `MessageChannel`. |
| `signer`   | `SignerController`  | Headless — caller supplies a signer (Turnkey / MetaMask / Keplr / custom).  |
| `auto`     | resolved at init    | Resolves to `popup` on desktop, `redirect` on mobile/PWA.                   |

Each controller surfaces the same state shape via `runtime.subscribe`, so wrappers don't have to special-case modes.

## Strategy injection (running outside the browser)

The runtime reaches the host environment through three injectable strategies:

```ts
import {
  createAbstraxionRuntime,
  type StorageStrategy,
  type RedirectStrategy,
  type IframeTransportStrategy,
} from "@burnt-labs/abstraxion-js";

const runtime = createAbstraxionRuntime(config, {
  storage: myStorageStrategy, // implements StorageStrategy
  redirect: myRedirectStrategy, // implements RedirectStrategy
  iframeTransport: myIframeTransport, // implements IframeTransportStrategy
});
```

Defaults are browser-native:

- `BrowserStorageStrategy` — `localStorage`
- `BrowserRedirectStrategy` — `window.location` + `URLSearchParams`
- `BrowserIframeTransportStrategy` — DOM iframe + `MessageChannel`

You only override the ones whose default doesn't fit your environment — e.g. `@burnt-labs/abstraxion-react-native` injects an AsyncStorage-backed `StorageStrategy`, an Expo-WebBrowser-backed `RedirectStrategy`, and a `react-native-webview`-backed `IframeTransportStrategy`. Modes you don't use (`signer` doesn't need a redirect strategy, `redirect` doesn't need an iframe transport) can be left unset.

## Direct signing

Two clients are exposed for direct signing (where the meta-account signs each transaction itself, paying its own gas):

- `RequireSigningClient` — single client that handles popup / redirect / iframe transports. The transport is selected from the active controller; consumers don't pick it directly.
- `AAClient` — used in `signer` mode; wraps the externally-supplied signer (MetaMask, Keplr, Turnkey, …).

Both expose the same `signAndBroadcast` / `sendTokens` / `execute` surface, so switching between session-key signing and direct signing is a one-line change in the consumer.

## Public surface (selected exports)

```ts
export { createAbstraxionRuntime } from "@burnt-labs/abstraxion-js";
export type { AbstraxionRuntime, AbstraxionRuntimeOptions } from "@burnt-labs/abstraxion-js";

export {
  BaseController,
  IframeController,
  PopupController,
  RedirectController,
  SignerController,
  createController,
} from "@burnt-labs/abstraxion-js";

export {
  BrowserStorageStrategy,
  BrowserRedirectStrategy,
  BrowserIframeTransportStrategy,
} from "@burnt-labs/abstraxion-js";
export type {
  IframeTransportStrategy,
  // RedirectStrategy and StorageStrategy are re-exported from abstraxion-core
} from "@burnt-labs/abstraxion-js";

export { RequireSigningClient, AAClient } from "@burnt-labs/abstraxion-js";

export { ConnectorType, IframeMessageType, MessageTarget } from "@burnt-labs/abstraxion-js";
export { AUTHENTICATOR_TYPE } from "@burnt-labs/abstraxion-js";
```

For configuration types (`AbstraxionConfig`, `AuthenticationConfig`, etc.) see [`packages/abstraxion-js/src/types.ts`](src/types.ts) — they are re-exported from the framework wrappers as well.

## Building a new framework wrapper

The Svelte demo at [`demos/svelte/`](../../demos/svelte) is the worked example: it creates a runtime, subscribes from a Svelte `writable`, and renders against the resulting store. The same pattern works for Vue (`ref` + `watchEffect`), SolidJS (`createStore`), or any reactivity primitive that can mirror an external subscription.

## License

MIT
