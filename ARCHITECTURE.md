# xion.js Architecture: Wrappers, Runtime, Controllers, Orchestrators, and Connectors

This document explains how the architectural layers of the xion.js SDK fit together to provide a unified authentication and account management system across web, React Native, and other JavaScript runtimes.

## Overview

The SDK is structured as a **framework-agnostic runtime with thin per-framework wrappers**. The runtime owns all controller, orchestration, and connector logic; wrappers do nothing except mirror the runtime's reactive state into a host framework's primitive (React's `useSyncExternalStore`, Svelte stores, etc.).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Host application                                │
│                                                                        │
│  ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐ │
│  │ React (web)      │   │ React Native       │   │ Other framework  │ │
│  │                  │   │                    │   │ (Svelte / Vue /  │ │
│  │ abstraxion-react │   │ abstraxion-react-  │   │  vanilla JS)     │ │
│  │                  │   │ native             │   │                  │ │
│  │ • Provider       │   │ • Provider         │   │ Subscribe to the │ │
│  │ • hooks          │   │ • hooks            │   │ runtime directly │ │
│  │ • <Embed>        │   │ • <Embed> via RN   │   │                  │ │
│  │                  │   │   WebView          │   │                  │ │
│  └────────┬─────────┘   └─────────┬──────────┘   └─────────┬────────┘ │
│           │                       │                        │          │
└───────────┼───────────────────────┼────────────────────────┼──────────┘
            │                       │                        │
            └───────────────────────┼────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME LAYER                                       │
│                @burnt-labs/abstraxion-js                               │
│                                                                        │
│   createAbstraxionRuntime(config, strategies?) → AbstraxionRuntime     │
│        ├── runtime.subscribe(listener)   // state stream               │
│        ├── runtime.getState()                                          │
│        ├── runtime.login() / logout()                                  │
│        └── runtime.controller            // active controller          │
│                                                                        │
│   Controllers (per auth mode):                                         │
│     RedirectController · PopupController · IframeController            │
│     SignerController                                                   │
│                                                                        │
│   Strategies (DI seams — defaults are browser):                        │
│     StorageStrategy · RedirectStrategy · IframeTransportStrategy       │
│                                                                        │
│   Direct signing:                                                      │
│     RequireSigningClient (unifies popup / redirect / iframe)           │
│     AAClient            (signer mode — wallet prompts directly)        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ORCHESTRATOR LAYER                                    │
│              @burnt-labs/account-management                            │
│                                                                        │
│           ConnectionOrchestrator                                       │
│             • Session restoration / fail-fast guards                   │
│             • Account discovery / creation                             │
│             • Grant management                                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CONNECTOR LAYER                                      │
│              @burnt-labs/abstraxion-core                               │
│                                                                        │
│   Keplr / MetaMask / Turnkey / Privy / Web3Auth / custom               │
│   Iframe message protocol · Authz / treasury grant decoding            │
└────────────────────────────────────────────────────────────────────────┘

                        Foundations (pure):
   @burnt-labs/signers · @burnt-labs/constants · @burnt-labs/xion-types
```

### Strategy injection pattern

`abstraxion-js` exposes three strategy interfaces that controllers consume through dependency injection. Browser implementations are the defaults; React Native ships its own implementations; any other host can supply its own.

| Strategy interface         | What it abstracts                       | Browser default                 | React Native impl                |
| -------------------------- | --------------------------------------- | ------------------------------- | -------------------------------- |
| `StorageStrategy`          | Session persistence                     | `BrowserStorageStrategy` (`localStorage`) | AsyncStorage-backed strategy |
| `RedirectStrategy`         | Navigating away & receiving the callback | `BrowserRedirectStrategy` (`window.location`) | Expo WebBrowser + deep links |
| `IframeTransportStrategy`  | Mounting / messaging the embedded dashboard | `BrowserIframeTransportStrategy` (DOM iframe) | `RNWebViewIframeTransport` (`react-native-webview`) |

This is what lets the runtime live in a single package while React, React Native, and Svelte wrappers all consume the same controller code.

### Why a runtime + wrappers (instead of one React package)?

Earlier alphas shipped controllers and React glue together inside `@burnt-labs/abstraxion`. That tied the controllers to React's lifecycle and made non-React adoption (RN with its own renderer, Svelte, vanilla JS) require copy-pasted controller code or a private API surface.

`createAbstraxionRuntime` decouples the two:

- **Runtime** is framework-agnostic — it owns the state machine and exposes a `subscribe(listener) → unsubscribe` stream plus a `getState()` snapshot.
- **Wrappers** mirror that stream into the host framework's reactivity primitive. The React wrapper uses `useSyncExternalStore`; the React Native wrapper uses the same; the Svelte demo subscribes from a Svelte store.

The four controller types described in [Layer 3](#layer-3-controllers-abstraxion-js) are unchanged — they just live one package down so anything that imports them gets them framework-free.

## Layer 1: Connectors (abstraxion-core)

**Purpose**: Abstract wallet/signer connection details into a unified interface

**Location**: `packages/abstraxion-core/src/connectors/`

### What Connectors Do

Connectors handle the low-level wallet/signer integration:

- **Connection**: Establish connection to wallet/signer
- **Signing**: Provide a standardized signing interface
- **Availability**: Check if the wallet/signer is available
- **Metadata**: Provide display information (name, icon, type)

### Connector Types

```typescript
enum ConnectorType {
  COSMOS_WALLET = "cosmos-wallet", // Keplr, Leap, OKX
  ETHEREUM_WALLET = "ethereum-wallet", // MetaMask
  EXTERNAL_SIGNER = "external-signer", // Turnkey, Privy, Web3Auth
}
```

### Example: External Signer Connector

```typescript
const turnkeyConnector = new ExternalSignerConnector({
  metadata: {
    id: "turnkey",
    name: "Turnkey",
    type: ConnectorType.EXTERNAL_SIGNER,
  },
  signerConfig: {
    authenticatorType: "EthWallet",
    authenticator: "0x123...", // Ethereum address
    signMessage: async (hexMessage) => {
      // Sign with Turnkey
      return signature;
    },
  },
});
```

### Why Connectors?

**Separation of concerns**: Wallet integration logic is isolated from business logic. This allows:

- Adding new wallets without changing core logic
- Testing without real wallets
- Consistent interface across different signer types (Cosmos, Ethereum, external)

## Layer 2: Orchestrator (account-management)

**Purpose**: Coordinate the complex multi-step connection flow

**Location**: `packages/account-management/src/orchestrator/`

### What the Orchestrator Does

The `ConnectionOrchestrator` handles the business logic of connecting:

1. **Session Restoration**: Check if a valid session exists (keypair + granter + valid grants)
2. **Account Discovery**: Find existing smart account for an authenticator
3. **Account Creation**: Create new smart account if none exists
4. **Grant Creation**: Create authorization grants (bank, stake, contracts)
5. **Grant Verification**: Verify grants exist on-chain

### Flow Modules

The orchestrator delegates to specialized flow modules:

- `accountConnection.ts`: Connector connection & account discovery/creation
- `grantCreation.ts`: Authorization grant creation
- `sessionRestoration.ts`: Session validation and restoration
- `redirectFlow.ts`: OAuth redirect flow handling

### Example: Complete Connection Flow

```typescript
const orchestrator = new ConnectionOrchestrator({
  sessionManager, // Manages keypair and granter storage
  storageStrategy, // localStorage or AsyncStorage
  accountStrategy, // How to discover/create accounts
  grantConfig, // What grants to create
  chainId: "xion-testnet-1",
  rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
  gasPrice: "0.001uxion",
});

// Try to restore existing session
const restored = await orchestrator.restoreSession();

// If no session, connect with a connector
if (!restored.success) {
  const result = await orchestrator.connectAndSetup(connector);
  // result.smartAccountAddress is the granter address
  // result.signingClient is ready to use
}
```

### Why an Orchestrator?

**Complex coordination**: The connection flow has many steps with conditional logic:

- Session might already exist (skip connection)
- Grants might exist (skip grant creation)
- Account might not exist (trigger creation)
- Different flows for redirect vs signer modes

The orchestrator encapsulates this complexity so controllers stay simple.

## Layer 3: Controllers (abstraxion-js)

**Purpose**: Implement the per-mode auth state machine and lifecycle, framework-agnostic.

**Location**: `packages/abstraxion-js/src/controllers/`

### What Controllers Do

Controllers own the auth state machine for one mode at a time:

- **State Management**: Track connection state (idle, connecting, connected, error)
- **Subscriptions**: Stream state via `subscribe(listener)`; framework wrappers mirror this into their reactivity primitive
- **Lifecycle**: Handle initialization, cleanup, and reconnection
- **Mode-Specific Logic**: Implement redirect vs popup vs iframe vs signer differences

Controllers do **not** depend on React, the DOM, or any other host. Anything platform-specific (storage, redirects, iframe transport) is injected via the [strategy interfaces](#strategy-injection-pattern).

### Controller Types

#### RedirectController

Used for **dashboard-based authentication** via full-page redirect (OAuth flow):

```typescript
class RedirectController extends BaseController {
  async connect(): Promise<void> {
    // Generate session keypair, redirect to dashboard
  }
  // On page load, detects ?granted=true&granter=<address> callback
}
```

**Use case**: Web apps that want a hosted authentication UI. Default mode if no `authentication` config.

**Direct signing**: `RequireSigningClient` (redirect transport) — redirects to dashboard for transaction approval, returns with result.

#### PopupController

Used for **dashboard-based authentication** in a popup window (user stays on dApp page):

```typescript
class PopupController extends BaseController {
  async connect(): Promise<void> {
    // Generate session keypair, open dashboard in popup window
    // Listen for CONNECT_SUCCESS / CONNECT_REJECTED via postMessage
  }
}
```

**Use case**: Desktop web apps that want seamless authentication without page navigation.

**Direct signing**: `RequireSigningClient` (popup transport) — opens dashboard popup for each transaction approval.

#### IframeController

Used for **inline embedded authentication** — dashboard runs inside an iframe on your page:

```typescript
class IframeController extends BaseController {
  setContainerElement(el: HTMLElement): void {
    // Mount iframe into the provided container element
  }
  async connect(): Promise<void> {
    // Communicate with iframe via MessageChannel
    // Listen for CONNECT_SUCCESS via postMessage
  }
  async signWithMetaAccount(msgs, fee, memo): Promise<DeliverTxResponse> {
    // Send SIGN_AND_BROADCAST to iframe, user approves inside iframe
  }
}
```

**Use case**: Apps that want full control over where the auth UI appears, white-label experiences, no popup issues.

**Direct signing**: `RequireSigningClient` (iframe transport) — routes approval through the embedded iframe.

**Sizing**: The iframe fills 100% of its container element. You control size via CSS on the container.

#### SignerController

Used for **headless authentication** with custom connectors:

```typescript
class SignerController extends BaseController {
  async connect(): Promise<void> {
    // Call developer-provided getSignerConfig()
    // Use orchestrator to discover/create smart account
  }
  async initialize(): Promise<void> {
    const restored = await this.orchestrator.restoreSession();
  }
}
```

**Use case**: Apps that want full control over authentication UI (Turnkey, Privy, MetaMask, Keplr, custom wallets).

**Direct signing**: `AAClient` — prompts the external wallet for each transaction signature.

### Auto Mode Resolution

The `"auto"` authentication type resolves to the best controller at initialization:

```
Desktop browser  → PopupController
Mobile / PWA     → RedirectController
```

Detection uses: user-agent, `navigator.maxTouchPoints`, viewport width (<1024px), portrait aspect ratio, and `display-mode: standalone` media query.

### Why Controllers?

Controllers exist so the SDK's state machine has exactly one home regardless of the host framework. They expose:

- **State updates** via `subscribe(listener)` — wrappers mirror this into React's `useSyncExternalStore`, a Svelte store, etc.
- **Lifecycle** — `initialize`, `connect`, `disconnect` are the same shape everywhere; only the strategy implementations differ.
- **Mode-specific transport** — popup vs redirect vs iframe vs signer all extend the same `BaseController` so wrappers don't have to special-case them.

Without this layer, every React/RN/Svelte integration would re-implement the same state machine — which is exactly what the early alphas had to do, and exactly what `createAbstraxionRuntime` was extracted to fix.

## SDK Usage Patterns

The following examples show how downstream developers use the SDK. All controller internals are handled automatically by `AbstraxionProvider` — you only interact with hooks and config.

For full working examples, see the demo app at `apps/demo-app/src/app/`.

### Popup / Auto Mode

```tsx
// layout.tsx — wrap your app with the provider
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react";

<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    authentication: { type: "auto" }, // popup on desktop, redirect on mobile
  }}
>
  {children}
</AbstraxionProvider>;
```

```tsx
// page.tsx — connect and sign
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion-react";

function MyPage() {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isConnecting,
  } = useAbstraxionAccount();

  // Session key client — gasless, silent
  const { client } = useAbstraxionSigningClient();

  // Direct signing client — meta-account signs, user pays gas
  const { client: directClient } = useAbstraxionSigningClient({
    requireAuth: true,
  });

  const handleLogin = async () => {
    try {
      await login(); // Opens popup (or redirects on mobile)
    } catch (err) {
      // Handle popup blocked, user rejected, etc.
    }
  };

  const handleSend = async () => {
    // Session key: silent, gasless
    await client.sendTokens(account.bech32Address, recipient, amount, "auto");
  };

  const handleSecureSend = async () => {
    // Direct: opens approval popup, user pays gas from their XION balance
    await directClient.sendTokens(
      account.bech32Address,
      recipient,
      amount,
      "auto",
    );
  };
}
```

See `apps/demo-app/src/app/popup-demo/` for the complete example.

### Inline Iframe Mode

```tsx
// layout.tsx
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    authentication: { type: "iframe" }, // iframeUrl defaults from chainId
  }}
>
  {children}
</AbstraxionProvider>
```

```tsx
// page.tsx — attach iframe to a container you control
import {
  AbstraxionContext,
  IframeController,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion-react";
import { useContext, useEffect, useRef } from "react";

function MyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { controller } = useContext(AbstraxionContext);
  const { login, isConnected } = useAbstraxionAccount();

  // Mount the iframe into your container
  useEffect(() => {
    if (containerRef.current && controller instanceof IframeController) {
      controller.setContainerElement(containerRef.current);
    }
  }, [controller]);

  // Start auth flow — user logs in inside the iframe
  useEffect(() => {
    if (controller && !isConnected) {
      login().catch(console.error);
    }
  }, [controller, isConnected]);

  return (
    <div style={{ display: "flex" }}>
      {/* You control the iframe size via the container's CSS */}
      <div ref={containerRef} style={{ width: 420, height: 600 }} />
      <div>{/* Your app content */}</div>
    </div>
  );
}
```

See `apps/demo-app/src/app/inline-demo/` for the complete example.

### Signer Mode (MetaMask / Keplr — no dashboard)

```tsx
// layout.tsx — provide wallet signing function, no dashboard involved
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    feeGranter: "xion1...",
    authentication: {
      type: "signer",
      aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
      getSignerConfig: async () => {
        const signer = await metamask.getSigner();
        return {
          authenticatorId: "...",
          authenticatorType: AUTHENTICATOR_TYPE.SECP256K1,
          account: signer,
        };
      },
      smartAccountContract: {
        codeId: 12,
        checksum: "...",
        addressPrefix: "xion",
      },
    },
  }}
>
  {children}
</AbstraxionProvider>
```

```tsx
// page.tsx — same hooks as all other modes
const { data: account, login, isConnected } = useAbstraxionAccount();
const { client } = useAbstraxionSigningClient(); // GranteeSignerClient (gasless)
const { client: directClient } = useAbstraxionSigningClient({
  requireAuth: true,
}); // AAClient (MetaMask prompts)
```

See `apps/demo-app/src/app/direct-signing-demo/` for the complete example with MetaMask.

## Key Design Principles

### 1. Separation of Concerns

Each layer has a single responsibility:

- **Connectors**: Wallet/signer integration
- **Orchestrator**: Business logic and flow coordination
- **Controllers + runtime**: Per-mode state machine, exposed framework-agnostically
- **Wrappers**: Mirror runtime state into a host framework's reactivity primitive

This makes the codebase easier to understand, test, and modify.

### 2. Dependency Direction

Dependencies flow downward:

- Wrappers (`abstraxion-react`, `abstraxion-react-native`) depend on the runtime (`abstraxion-js`)
- Runtime depends on orchestrator (`account-management`) and connectors (`abstraxion-core`)
- Orchestrator depends on connectors
- Connectors and the foundation packages (`signers`, `constants`) have no dependencies on other SDK layers

This prevents circular dependencies and makes the code more maintainable.

### 3. Platform Agnostic by default

Every layer except the wrappers is platform-agnostic:

- **Connectors**: Pure logic — work in Node.js, browser, React Native
- **Orchestrator**: Uses storage strategy abstraction
- **Controllers / runtime**: Inject `StorageStrategy`, `RedirectStrategy`, `IframeTransportStrategy`; defaults are browser, RN ships its own
- **Wrappers**: Platform-specific by design — bind the runtime to React, React Native, Svelte, etc.

This allows reuse across platforms without forking the controller code.

### 4. Testability

Each layer can be tested independently:

- **Connector tests**: Mock wallet APIs
- **Orchestrator tests**: Mock connectors and storage
- **Controller / runtime tests**: Mock orchestrator and supply test strategies
- **Wrapper tests**: Mount the runtime, drive it from a test harness, assert hook output

### 5. Extensibility

New functionality can be added without modifying existing code:

- **New connector**: Implement `Connector` interface
- **New account strategy**: Implement `AccountStrategy` interface
- **New controller mode**: Extend `BaseController`
- **New host platform**: Implement `StorageStrategy` / `RedirectStrategy` / `IframeTransportStrategy` and mirror `runtime.subscribe` into the framework's reactivity primitive — see the Svelte demo at `demos/svelte/` for a worked example
- **New framework wrapper**: Add a sibling to `abstraxion-react` / `abstraxion-react-native`; the runtime stays unchanged

## File Organization

```
xion.js/
├── packages/
│   ├── abstraxion-core/          # Layer 1: Connectors
│   │   ├── src/connectors/
│   │   │   ├── types.ts          # Connector interface
│   │   │   ├── ConnectorRegistry.ts
│   │   │   └── ExternalSignerConnector.ts
│   │   └── src/AbstraxionAuth.ts # Session manager implementation
│   │
│   ├── account-management/       # Layer 2: Orchestrator
│   │   ├── src/orchestrator/
│   │   │   ├── orchestrator.ts   # Main orchestrator
│   │   │   └── flow/             # Flow modules
│   │   │       ├── accountConnection.ts
│   │   │       ├── grantCreation.ts
│   │   │       ├── sessionRestoration.ts
│   │   │       └── redirectFlow.ts
│   │   └── src/accounts/         # Account strategies
│   │
│   ├── abstraxion-js/            # Layer 3: Runtime + Controllers (framework-agnostic)
│   │   ├── src/runtime.ts        # createAbstraxionRuntime — entry point
│   │   ├── src/controllers/
│   │   │   ├── types.ts          # Controller interface
│   │   │   ├── BaseController.ts # State machine base
│   │   │   ├── RedirectController.ts
│   │   │   ├── PopupController.ts
│   │   │   ├── IframeController.ts
│   │   │   ├── SignerController.ts
│   │   │   └── factory.ts        # Controller factory (routes config → controller)
│   │   ├── src/signing/
│   │   │   ├── RequireSigningClient.ts  # Unified popup/redirect/iframe direct signing
│   │   │   └── AAClient.ts       # Direct signing for signer mode
│   │   ├── src/strategies/
│   │   │   ├── BrowserStorageStrategy.ts
│   │   │   ├── BrowserRedirectStrategy.ts
│   │   │   ├── BrowserIframeTransportStrategy.ts
│   │   │   └── IframeTransportStrategy.ts  # Strategy interfaces
│   │   └── src/utils/
│   │       ├── normalizeAbstraxionConfig.ts
│   │       └── resolveAutoAuth.ts
│   │
│   ├── abstraxion-react/         # Layer 4a: React wrapper (web)
│   │   ├── src/AbstraxionProvider.tsx
│   │   ├── src/hooks/            # useAbstraxionAccount / Client / SigningClient / ManageAuthenticators
│   │   └── src/components/AbstraxionEmbed.tsx
│   │
│   └── abstraxion-react-native/  # Layer 4b: React Native wrapper
│       ├── src/AbstraxionProvider.tsx
│       ├── src/hooks/
│       ├── src/strategies/       # AsyncStorage / Expo / RN-WebView strategies
│       └── src/components/AbstraxionEmbed.tsx  # In-app WebView embed
```

## Direct Signing Architecture

The SDK supports two signing flows. Both are available in every authentication mode.

### Session Key Signing (default)

```
dApp → useAbstraxionSigningClient() → GranteeSignerClient → chain
```

- Signs with a locally-stored session keypair (grantee)
- Gasless via fee grants — user pays nothing
- Silent — no popups, no user interaction per transaction
- The on-chain signer is the grantee address (via Authz Exec)

### Direct Signing (`requireAuth: true`)

```
dApp → useAbstraxionSigningClient({ requireAuth: true }) → mode-specific client → user approval → chain
```

- **The meta-account signs each transaction directly** — not the session key
- The on-chain signer is the meta-account address itself (not a grantee via Authz Exec)
- Each transaction requires explicit user approval (wallet popup, dashboard popup/iframe, or redirect)
- **User pays gas from their meta-account XION balance** — fee grants are NOT used
- The meta-account must have sufficient XION balance or the transaction will fail
- The approval mechanism depends on the authentication mode:

| Mode         | Direct Signing Client            | Approval UX                                     |
| ------------ | -------------------------------- | ----------------------------------------------- |
| redirect     | `RequireSigningClient` (redirect) | Redirects to dashboard for approval             |
| popup / auto | `RequireSigningClient` (popup)    | Opens dashboard popup for approval              |
| iframe       | `RequireSigningClient` (iframe)   | Sends `SIGN_AND_BROADCAST` to iframe            |
| signer       | `AAClient`                        | Prompts external wallet (MetaMask, Keplr, etc.) |

`RequireSigningClient` was previously three separate classes (`PopupSigningClient`, `RedirectSigningClient`, `IframeSigningClient`); they were consolidated in alpha.78. The transport is selected from the active controller — consumers don't pick it directly.

### Code Pattern

Both clients expose the same API, so switching is a one-line change:

```tsx
// Session key — silent, gasless
const { client } = useAbstraxionSigningClient();

// Direct — user approval, user pays gas
const { client, error } = useAbstraxionSigningClient({ requireAuth: true });

// Same API for both:
await client.sendTokens(from, to, amount, "auto", memo);
await client.signAndBroadcast(address, messages, "auto", memo);
```

## When to Use Each Mode

### Auto Mode (recommended)

**Best for**: Most web applications

**Config**: `authentication: { type: "auto" }`

Resolves to popup on desktop, redirect on mobile. Gives the best UX for each platform automatically.

### Popup Mode (PopupController)

**Best for**:

- Desktop-first applications
- Apps where preserving page state is critical

**Pros**:

- User never leaves the dApp
- No loss of application state
- Popup closes automatically after auth

**Cons**:

- Popup blockers can interfere (handle with try/catch)
- Not ideal for mobile (use auto mode instead)

### Redirect Mode (RedirectController)

**Best for**:

- Consumer-facing applications
- Mobile-first applications
- Apps that want minimal integration work

**Pros**:

- Hosted authentication UI
- No popup blocking issues
- Supports Web3Auth, Passkeys, email login

**Cons**:

- Requires full-page redirect (disrupts UX)
- Application state lost during redirect

### Inline Iframe Mode (IframeController)

**Best for**:

- White-label experiences
- Apps that want the auth UI embedded in their layout
- Cases where popup blockers are a concern

**Pros**:

- No popups, no redirects
- Full control over placement and sizing
- Can hide/resize after authentication
- Secure `MessageChannel` communication

**Cons**:

- Requires more setup (container ref + controller wiring)
- iframe must be rendered during authentication
- Requires dashboard deployment that supports iframe embedding

### Signer Mode (SignerController)

**Best for**:

- Apps with existing authentication (Turnkey, Privy, Web3Auth)
- Apps that want custom UI/UX
- Direct wallet connections (MetaMask, Keplr)
- Mobile apps (React Native)

**Pros**:

- Full control over UI/flow
- No redirect or popup required
- Headless integration
- Works in React Native

**Cons**:

- More integration work
- Need to provide `getSignerConfig` and smart account contract details
- Handle wallet connection UI yourself

## Summary

The architecture provides:

1. **Connectors** (`abstraxion-core`): Standardize wallet/signer integration
2. **Orchestrator** (`account-management`): Coordinate complex connection flows
3. **Runtime + Controllers** (`abstraxion-js`): Framework-agnostic state machine, exposed via `createAbstraxionRuntime`
4. **Wrappers** (`abstraxion-react`, `abstraxion-react-native`, …): Bind the runtime to a host framework's reactivity primitive

This separation makes the codebase:

- **Maintainable**: Each layer has clear responsibilities
- **Testable**: Layers can be tested independently
- **Extensible**: New functionality can be added without breaking changes
- **Reusable**: Lower layers work across platforms

The key insight is that **authentication is complex**, and this architecture breaks that complexity into manageable, well-defined layers.

Every controller supports both session-key signing (gasless, silent) and direct signing (`requireAuth: true`, explicit user approval). The signing flow is determined by the hook option, while the approval UX is determined by the authentication mode — keeping the two concerns orthogonal.
