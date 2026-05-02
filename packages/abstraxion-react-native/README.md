# @burnt-labs/abstraxion-react-native

React Native bindings for the XION Abstraxion authentication system. Mirrors the public hook surface of `@burnt-labs/abstraxion-react`, with React-Native-appropriate transports for storage (AsyncStorage), redirect auth (Expo WebBrowser + deep links), and embedded auth (in-app `react-native-webview`).

Built on `@burnt-labs/abstraxion-js` — the same framework-agnostic runtime that powers the React and Svelte wrappers. This package is the React-on-React-Native binding, not a separate auth implementation.

## Features

- Authentication against XION dashboard via Expo WebBrowser (redirect) or in-app WebView (embedded)
- AsyncStorage-backed session storage; survives app restarts
- Deep-link callback handling (Expo Linking) for the redirect flow
- Drop-in `<AbstraxionEmbed>` component for the embedded WebView flow with auto-modal during login and approval
- Session-key signing (gasless) by default; meta-account direct signing via `useAbstraxionSigningClient({ requireAuth: true })`
- Manage authenticators (add/remove passkeys, OAuth, etc.) supported in both redirect and embedded modes

## Installation

```sh
npm install @burnt-labs/abstraxion-react-native \
  @react-native-async-storage/async-storage \
  expo-web-browser \
  expo-linking
```

Peer dependencies you must also install (declared in `peerDependencies`):

- `react-native-get-random-values` — required, populates `crypto.getRandomValues` for keypair generation.
- `react-native-quick-crypto` — required for signing transactions; native JSI module so it does **not** work in Expo Go (use a custom dev client or simulator).

If you use the embedded mode (`<AbstraxionEmbed>`), also install:

- `react-native-webview` — declared as an **optional** peer dependency. The package lazy-`require`s it only when the embed mounts, so consumers on `redirect` / `signer` modes don't pay the native module cost.

```sh
npm install react-native-webview            # only for embedded mode
```

## Quick start (redirect mode)

```tsx
import { AbstraxionProvider, useAbstraxionAccount } from "@burnt-labs/abstraxion-react-native";

const config = {
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com",
  restUrl: "https://api.xion-testnet-2.burnt.com",
  gasPrice: "0.001uxion",
  treasury: "xion13jetl8j9kcgsva86l08kpmy8nsnzysyxs06j4s69c6f7ywu7q36q4k5smc",
  callbackUrl: "your-app-scheme://",  // matches your app.json scheme
};

export default function App() {
  return (
    <AbstraxionProvider config={config}>
      <Screen />
    </AbstraxionProvider>
  );
}

function Screen() {
  const { data, isConnected, login, logout } = useAbstraxionAccount();
  return isConnected ? (
    <Text onPress={logout}>Connected as {data.bech32Address}</Text>
  ) : (
    <Text onPress={login}>Sign in</Text>
  );
}
```

## Demo

A working Expo + React Native demo lives in [`demos/react-native/`](../../demos/react-native/) at the repo root. It exercises both supported dashboard modes:

- `/` — redirect mode (Expo WebBrowser session + deep link callback)
- `/embedded` — embedded mode (in-app `<WebView>` + `<AbstraxionEmbed>`)

See [`demos/react-native/README.md`](../../demos/react-native/README.md) for runtime options (iOS simulator, Expo Go, custom dev client) and the trade-offs between them.

## Authentication modes

| Mode | Status | Transport |
| --- | --- | --- |
| `redirect` | ✅ Supported | Expo WebBrowser auth session + Expo Linking deep-link callback |
| `embedded` | ✅ Supported | `react-native-webview` (`<AbstraxionEmbed>` component) |
| `signer` | ✅ Supported | Caller-supplied signing function (Turnkey, Privy, MetaMask…) |
| `popup` / `auto` | ❌ Web-only | `popup` requires `window.open`; `auto`'s device sniffing depends on browser APIs. Both throw at provider mount on RN — pick `redirect` or `embedded` explicitly. |

Direct signing (`requireAuth: true`) works in `redirect` mode (round-trips to dashboard via WebBrowser), in `embedded` mode (signing UI shown in the in-app WebView), and in `signer` mode (returns a direct `AAClient`).

## Embedded mode (`<AbstraxionEmbed>`)

Embedded mode mounts the dashboard inside a `react-native-webview` `<WebView>` so login, grant approval, and signing happen in-app — no Expo WebBrowser session, no deep-link round-trip.

```tsx
import {
  AbstraxionEmbed,
  AbstraxionProvider,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion-react-native";

const config = {
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com",
  restUrl: "https://api.xion-testnet-2.burnt.com",
  gasPrice: "0.001uxion",
  authentication: { type: "embedded" as const },
};

export default function App() {
  return (
    <AbstraxionProvider config={config}>
      <AbstraxionEmbed
        idleView="button"
        connectedView="hidden"
        approvalView="modal"
      />
    </AbstraxionProvider>
  );
}
```

Place `<AbstraxionEmbed>` once at the root of your app — only one embed should be mounted at a time so the controller's WebView container reference stays stable across state changes.

### Visibility-state matrix

The embed has four user-facing states. Pick props for each based on what should happen when the user has work to do *inside* the dashboard (login, approve, manage authenticators) versus when the embed should stay out of the way.

| State | Trigger | Default rendering |
| --- | --- | --- |
| Idle (no session yet) | `!isConnected && !isConnecting` | `idleView="button"` shows the login button; `"fullview"` shows the WebView at the consumer's `style`; `"hidden"` renders nothing visible. |
| Connecting (login in progress) | `isConnecting` | WebView auto-promotes to a full-screen `<Modal>` when `idleView !== "fullview"` and `approvalView === "modal"`. Dismissing the modal calls `controller.cancelLogin()` and returns to idle. |
| Connected (no pending approval) | `isConnected && !isAwaitingApproval` | `connectedView="hidden"` collapses to 0×0; `"visible"` renders at the consumer's `style`. |
| Approval pending | `isConnected && isAwaitingApproval` | `approvalView="modal"` opens the WebView in a centered `<Modal>` (default); `"inline"` renders at the consumer's `style`. |

#### Why the connecting modal exists

`react-native-webview` renders nothing visible when its parent has no width or height. Without the auto-modal, an embed configured with `idleView="button"` or `idleView="hidden"` and no `style` would fall through to a 0×0 `<View>` the moment login starts — the user couldn't see the dashboard's authenticator picker. The auto-modal during `isConnecting` removes that footgun. Set `approvalView="inline"` if you want to manage the connecting layout yourself.

#### When you need to pass `style`

Only when the WebView should render in flow with your layout — i.e., `idleView="fullview"`, `connectedView="visible"`, or `approvalView="inline"`. The collapsed and modal paths ignore `style`.

### `<AbstraxionEmbed>` props and ref

```typescript
interface AbstraxionEmbedProps {
  /** Default "button". */
  idleView?: "button" | "fullview" | "hidden";
  /** Default: same as idleView. */
  disconnectedView?: "button" | "fullview" | "hidden";
  /** Default "hidden". */
  connectedView?: "hidden" | "visible";
  /** Default "modal". */
  approvalView?: "modal" | "inline";
  /** Override the default "Sign in with XION" label. */
  loginLabel?: ReactNode;
  /** Required only when WebView renders inline (see "When you need to pass style" above). */
  style?: ViewStyle;
}

interface AbstraxionEmbedHandle {
  /** Force a reload of the dashboard WebView. Rarely needed. */
  reload(): void;
}
```

`AbstraxionEmbed` is a `forwardRef` component — pass a ref to call `reload()` if your app needs to recover from a stuck WebView.

## Hooks

### `useAbstraxionAccount`

```typescript
const {
  data,                  // { bech32Address: string }
  isConnected,           // session present
  isConnecting,          // login in progress
  isInitializing,        // restoring session from storage on mount
  isDisconnected,        // true after explicit logout (distinct from idle)
  isLoading,             // isInitializing || isConnecting
  isReturningFromAuth,   // redirect mode only — handling deep-link callback
  isLoggingIn,           // isConnecting && !isInitializing
  isError,
  error,
  login,                 // () => Promise<void>
  logout,                // () => Promise<void>
} = useAbstraxionAccount();
```

### `useAbstraxionClient`

Read-only CosmWasm client.

```typescript
const { client, error } = useAbstraxionClient();
// client: CosmWasmClient | undefined
```

### `useAbstraxionSigningClient`

Default returns the gasless session-key signer. Pass `{ requireAuth: true }` to get a direct meta-account signer instead.

```typescript
const { client, signArb, rpcUrl, error, signResult, clearSignResult } =
  useAbstraxionSigningClient();
// client: GranteeSignerClient | undefined — session-key signing
// signArb: (signerAddress, message) => Promise<string>

const direct = useAbstraxionSigningClient({ requireAuth: true });
// embedded mode  → RequireSigningClient that pops the approval modal in-WebView
// redirect mode  → RequireSigningClient that round-trips through WebBrowser;
//                  the signed result lands in `direct.signResult` after the deep link
//                  fires. Call `direct.clearSignResult()` after consuming.
// signer mode    → AAClient built from your injected signing function
```

### `useManageAuthenticators`

Add or remove authenticators (passkeys, OAuth, etc.) on the connected account.

```typescript
const {
  manageAuthenticators,    // () => Promise<void>
  isSupported,             // true in redirect or embedded mode
  unsupportedReason,       // string when isSupported === false (e.g. signer mode)
  manageAuthResult,        // redirect mode only — populated after deep-link return
  clearManageAuthResult,
} = useManageAuthenticators();
```

In redirect mode the result lands in `manageAuthResult` once Expo WebBrowser closes; in embedded mode the call resolves directly because the dashboard reports back over the WebView bridge.

### `useAbstraxionContext`

Escape hatch to the full provider context. Prefer the typed hooks above for everything they cover.

## Configuration

```typescript
interface AbstraxionConfig {
  // Network — all default to xion-testnet-2 if omitted.
  rpcUrl?: string;
  restUrl?: string;
  gasPrice?: string;       // e.g. "0.001uxion"
  chainId?: string;

  // Optional grant configuration.
  treasury?: string;
  bank?: SpendLimit[];
  stake?: boolean;
  contracts?: ContractGrantDescription[];

  // Auth.
  authentication?:
    | { type: "redirect"; callbackUrl?: string; authAppUrl?: string }
    | { type: "embedded"; iframeUrl?: string }
    | { type: "signer"; aaApiUrl: string; getSignerConfig: () => Promise<SignerConfig> };

  // Convenience for redirect mode — equivalent to authentication.callbackUrl.
  callbackUrl?: string;
}
```

If `authentication` is omitted, the provider defaults to `{ type: "redirect", callbackUrl }`. `{ type: "popup" }` and `{ type: "auto" }` throw at provider mount — they're web-only.

## Deep linking (redirect mode)

The redirect flow needs a deep-link callback so the dashboard can hand the user (and the granter address) back to your app.

For Expo, in `app.json`:

```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "category": ["DEFAULT", "BROWSABLE"],
          "data": { "scheme": "your-app-scheme" }
        }
      ]
    }
  }
}
```

For bare React Native, configure deep linking per platform docs. The callback URL you pass to `AbstraxionConfig.callbackUrl` must match the scheme registered above. Expo WebBrowser's auth-session API handles dismissing the in-app browser automatically once the redirect lands.

## Architecture and exports

```typescript
import {
  // Provider + context
  AbstraxionProvider,
  AbstraxionContext,

  // Hooks
  useAbstraxionAccount,
  useAbstraxionClient,
  useAbstraxionSigningClient,
  useManageAuthenticators,

  // Embedded mode
  AbstraxionEmbed,
  type AbstraxionEmbedHandle,
  type AbstraxionEmbedProps,

  // Strategies (advanced — usually you don't import these directly)
  ReactNativeStorageStrategy,   // wraps AsyncStorage as the SDK's StorageStrategy
  ReactNativeRedirectStrategy,  // wraps Expo WebBrowser + Linking as RedirectStrategy
  RNWebViewIframeTransport,     // bridges <AbstraxionEmbed>'s WebView to IframeController
  type RNWebViewControl,
} from "@burnt-labs/abstraxion-react-native";
```

The provider wires these strategies into `createAbstraxionRuntime` from `@burnt-labs/abstraxion-js` and exposes the resulting `runtime.controller` through context. Hooks read from the runtime's external store via `useSyncExternalStore`, so account state stays consistent under React 18 concurrent rendering.

## License

MIT
