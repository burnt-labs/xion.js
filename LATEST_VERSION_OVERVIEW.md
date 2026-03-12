# xion.js Version Overview

This document contains a comprehensive overview of all changelog entries across all packages in the xion.js monorepo.

The document is split into two sections:

1. **New in this version (`1.0.0-alpha.76`)** — popup, auto, and iframe authentication modes, direct signing, and supporting changes
2. **Previous version recap (`1.0.0-alpha.70`)** — summary of changes already released (config object refactor, UI removal, connector architecture, signer mode)

---

# New in This Version (`@burnt-labs/abstraxion@1.0.0-alpha.76`)

## Authentication Modes

The SDK now supports five authentication modes (two from the previous version — redirect and signer — plus three new ones). All are configured via the `authentication` field on `AbstraxionProvider` config. For popup, redirect, auto, and iframe modes the auth app URL defaults to the chain-specific dashboard URL (fetched from the chain's RPC config at runtime for popup/redirect, or from `@burnt-labs/constants` for iframe). You only need to provide `authAppUrl` or `iframeUrl` if you're overriding for local development or a custom deployment.

### Auto Mode (recommended for most dApps) — NEW

Automatically detects the environment and resolves to the best mode:

- **Desktop browsers** → popup (user stays on page)
- **Mobile / PWA** → redirect (navigates to auth app and back)

```tsx
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    authentication: {
      type: "auto",
      // authAppUrl and callbackUrl are optional — defaults are resolved from chainId
    },
  }}
/>
```

Detection uses: user-agent (mobile keywords), touch capability, viewport width (<1024px), portrait orientation, and PWA standalone mode.

> **Demo:** See [`apps/demo-app/src/app/popup-demo/`](apps/demo-app/src/app/popup-demo/) — uses auto mode (popup on desktop, redirect on mobile).

### Popup Mode — NEW

Opens the auth app in a separate popup window. The user stays on the dApp page while the popup handles login and grant approval. The popup closes automatically on success.

```tsx
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    authentication: {
      type: "popup",
      // authAppUrl optional — auto-fetched from chain RPC config at runtime
    },
  }}
/>
```

**UX improvements over redirect:**

- User never leaves the dApp page
- No loss of application state during authentication
- Popup closes automatically after grant approval

**Handling popup blockers:** Wrap `login()` in a try/catch — if the popup is blocked, the error message will contain "popup". Prompt users to allow popups for your site.

> **Demo:** See [`apps/demo-app/src/app/popup-demo/`](apps/demo-app/src/app/popup-demo/) for a full working example.

### Inline Iframe Mode — NEW

Embeds the full dashboard inside an iframe on your page. The user authenticates and approves grants without leaving your layout. You control the iframe's position and size via a container element.

The `iframeUrl` defaults to the chain-specific iframe URL from `@burnt-labs/constants` (e.g. `https://settings.testnet.burnt.com`).

```tsx
// layout.tsx — provider config
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    authentication: {
      type: "iframe",
      // iframeUrl optional — defaults from constants based on chainId
    },
  }}
/>
```

```tsx
// page.tsx — mount the iframe into a container
import {
  AbstraxionContext,
  IframeController,
  useAbstraxionAccount,
} from "@burnt-labs/abstraxion";
import { useContext, useEffect, useRef } from "react";

function MyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { controller } = useContext(AbstraxionContext);
  const { login, isConnected } = useAbstraxionAccount();

  // Attach iframe to container element
  useEffect(() => {
    if (containerRef.current && controller instanceof IframeController) {
      controller.setContainerElement(containerRef.current);
    }
  }, [controller]);

  // Auto-start auth flow
  useEffect(() => {
    if (controller && !isConnected) {
      login().catch(console.error);
    }
  }, [controller, isConnected]);

  return (
    <div>
      {/* Iframe fills 100% of this container — you control sizing via CSS */}
      <div ref={containerRef} style={{ width: 420, height: 600 }} />

      {/* Your app content */}
      {isConnected && <p>Connected!</p>}
    </div>
  );
}
```

**UX improvements:**

- No popup blocking issues
- Full control over iframe placement and sizing
- Auth UI is part of your page layout — can be hidden/resized after connection
- Communication via `MessageChannel` (secure, origin-validated)

> **Demo:** See [`apps/demo-app/src/app/inline-demo/`](apps/demo-app/src/app/inline-demo/) for a full working example with container mounting and session management.

### Signer Mode (unchanged from previous version)

Signer mode lets you connect external wallets (MetaMask, Keplr, OKX) or auth providers (Turnkey, Privy, Web3Auth) **without any reliance on the dashboard or social logins**. See the [previous version recap](#signer-mode-wrap-metamaskkeplr-directly--no-dashboard-1) for configuration details.

> **Demo:** See [`apps/demo-app/src/app/signer-mode/`](apps/demo-app/src/app/signer-mode/) and [`apps/demo-app/src/app/direct-signing-demo/`](apps/demo-app/src/app/direct-signing-demo/) for MetaMask integration with direct signing.

---

## Direct Signing (`requireAuth: true`) — NEW

All modes support **direct signing** alongside the default session-key signing. Pass `{ requireAuth: true }` to `useAbstraxionSigningClient` to get a client where **the user's meta-account signs each transaction directly** — not the session key.

### Key differences from session-key signing

| Aspect                  | Session Key (default)            | Direct Signing (`requireAuth: true`)                             |
| ----------------------- | -------------------------------- | ---------------------------------------------------------------- |
| **Who signs**           | Session keypair (grantee)        | Meta-account directly (user's wallet or dashboard authenticator) |
| **On-chain signer**     | Grantee address via Authz Exec   | Meta-account address directly                                    |
| **User interaction**    | Silent — no prompts              | Explicit approval required per transaction                       |
| **Gas payment**         | Fee grant (gasless for the user) | **User pays gas from their meta-account XION balance**           |
| **Balance requirement** | None (fee grant covers gas)      | **Meta-account must hold XION to pay gas fees**                  |
| **Use case**            | Normal operations                | Security-critical operations                                     |

### Important: gas fees and balance

Direct signing does **not** use fee grants. The user's meta-account must have a XION balance to pay transaction gas fees. If the meta-account has insufficient balance, the transaction will fail. On testnet, users can get tokens from the [XION faucet](https://faucet.xion.burnt.com/).

### Code pattern

Both clients expose the same API, so switching is a one-line change:

```tsx
// Session key — silent, gasless, signed by grantee keypair
const { client } = useAbstraxionSigningClient();

// Direct — meta-account signs directly, user approves, user pays gas
const { client: directClient, error } = useAbstraxionSigningClient({
  requireAuth: true,
});

// Same API for both:
await client.sendTokens(from, to, amount, "auto", memo);
await client.signAndBroadcast(address, messages, "auto", memo);
```

### Client type by authentication mode

| Auth Mode    | Session Key Client    | Direct Signing Client   | Approval UX                                                  |
| ------------ | --------------------- | ----------------------- | ------------------------------------------------------------ |
| redirect     | `GranteeSignerClient` | `RedirectSigningClient` | Redirects to dashboard for approval                          |
| popup / auto | `GranteeSignerClient` | `PopupSigningClient`    | Opens dashboard popup for approval                           |
| iframe       | `GranteeSignerClient` | `IframeSigningClient`   | User approves inside embedded iframe                         |
| signer       | `GranteeSignerClient` | `AAClient`              | Wallet prompts directly (MetaMask popup, Keplr prompt, etc.) |

### When to use direct signing

- Security-critical operations (large withdrawals, changing account permissions)
- Operations that should require explicit user confirmation
- When the on-chain signer must be the meta-account itself (not a grantee)
- When you need a verifiable on-chain signature from the user's actual account

### When to use session key signing (default)

- Normal operations (transfers, mints, swaps, contract calls)
- High-frequency operations that should be seamless
- When gasless UX is important (fee grants cover gas)

> **Demo:** See [`apps/demo-app/src/app/direct-signing-demo/`](apps/demo-app/src/app/direct-signing-demo/) — compares session-key vs direct signing with MetaMask (signer mode). Uses the `useMetamask` hook from [`apps/demo-app/src/hooks/useMetamask.ts`](apps/demo-app/src/hooks/useMetamask.ts). - for usage in the traditional flow see [`apps/demo-app/src/app/inline-demo/`](apps/demo-app/src/app/inline-demo/) (or popup demo) which shows how to approve a direct signature from a logged in wallet using social auth like email/google.


---

## New Exports (this version)

**Config types:**

- `PopupAuthentication`, `AutoAuthentication`, `IframeAuthentication`
- `SignResult`, `SigningClient`
- `UseAbstraxionSigningClientOptions`, `UseAbstraxionSigningClientReturn`

**Signing clients:**

- `PopupSigningClient`, `RedirectSigningClient`, `IframeSigningClient`

**Controller:**

- `IframeController` (for `instanceof` checks when setting container element)

**Utilities:**

- `isMobileOrStandalone()` — device detection used by auto mode

**Core (abstraxion-core):**

- `MessageChannelManager` — request-response messaging for iframe communication
- `TypedEventEmitter`, `EventHandler` — typed event system used by controllers
- `IframeMessageType`, `MessageTarget` — enums for iframe message protocol

**Re-exported from signers:**

- `AAClient` — for direct signing in signer mode

**Constants:**

- `getIframeUrl(chainId)` — per-chain iframe dashboard URL

---

## Controller Architecture (this version)

- `PopupController` — popup-based OAuth flow with `postMessage` communication
- `IframeController` — inline iframe flow with `MessageChannelManager` for request-response
- Enhanced `RedirectController` — now supports `authAppUrl` override, improved session restoration
- Enhanced `SignerController` — wrong-wallet signing guard
- Controller factory updated to handle new `"popup"`, `"iframe"`, and `"auto"` types

---

## Fixes (this version)

- **Treasury grant restoration** — `decodeRestFormatAuthorization` handles the ABCI REST format change that broke session restoration
- **WebAuthn scope and URL param cleanup** — fixes passkey credential scope and cleans up `?granted=true` from URL after redirect
- **Wrong-wallet signing guard** — prevents signing from a wallet that doesn't match the connected account
- **Empty treasury grant configs** — `DirectQueryTreasuryStrategy` returns empty `grantConfigs` instead of throwing when treasury has no grant configs

---

## Demo Apps

All demos are in [`apps/demo-app/`](apps/demo-app/):

| Demo | Path | What it shows |
| --- | --- | --- |
| **Popup Auth** | [`popup-demo/`](apps/demo-app/src/app/popup-demo/) | Auto mode (popup on desktop, redirect on mobile), session-key signing, token transfers |
| **Inline Iframe** | [`inline-demo/`](apps/demo-app/src/app/inline-demo/) | Iframe mode with container mounting, session management, connected view |
| **Direct Signing** | [`direct-signing-demo/`](apps/demo-app/src/app/direct-signing-demo/) | MetaMask signer mode comparing session-key vs direct signing side-by-side |
| **Signer Mode** | [`signer-mode/`](apps/demo-app/src/app/signer-mode/) | External wallet integration without dashboard |
| **Abstraxion UI** | [`abstraxion-ui/`](apps/demo-app/src/app/abstraxion-ui/) | Pre-built modal component (redirect mode) |
| **Loading States** | [`loading-states/`](apps/demo-app/src/app/loading-states/) | Manual hook usage with custom UI |

---
---

# Previous Version Recap (`@burnt-labs/abstraxion@1.0.0-alpha.70`)

The changes below were part of the previous major version release. They are included here as a reference for migration, but are not specific to the actual latest major version.

---

## @burnt-labs/abstraxion (previous version)

### Removed Components and UI

- All UI components removed: `<Abstraxion />`, `<AbstraxionSignin />`, `<Connected />`, `<Loading />`, `<ErrorDisplay />`
- CSS import no longer needed - package is now UI-less
- `@burnt-labs/ui` dependency removed
- `useModal` hook removed - implement your own authentication UI

### Configuration Changes

`AbstraxionProvider` now requires a single `config` object:

```tsx
// Before
<AbstraxionProvider
  rpcUrl="..."
  restUrl="..."
  contracts={[...]}
  stake={true}
  bank={[...]}
  treasury="xion1..."
  indexerUrl="..."
  gasPrice="0.001uxion"
  dashboardUrl="..."
  callbackUrl="..."
>

// After
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-1", // REQUIRED
    // rpcUrl, restUrl, gasPrice auto-filled from chainId
    contracts: [...],
    stake: true,
    bank: [...],
    treasury: "xion1...",
    feeGranter: "xion1...",
    authentication: {
      type: "auto", // or "popup", "redirect", "iframe", "signer"
    }
  }}
>
```

**Key changes:**

- `chainId` now required
- `rpcUrl`, `restUrl`, `gasPrice` optional (auto-filled from chainId)
- `dashboardUrl` moved to `authentication.authAppUrl` (optional, auto-fetched from chain RPC config)
- `callbackUrl` moved to `authentication.callbackUrl`
- `indexerUrl` moved to `authentication.indexer` (signer mode only)

### Hook Changes

**`useAbstraxionSigningClient`:**

- No longer returns `logout` (moved to `useAbstraxionAccount`)
- Returns pre-configured `client` from state
- New option: `{ requireAuth: true }` for direct signing

```tsx
// Before
const { client, signArb, logout } = useAbstraxionSigningClient();

// After
const { client, signArb } = useAbstraxionSigningClient();
const { logout } = useAbstraxionAccount();
await logout(); // now async
```

### Context Changes

**Removed from `AbstraxionContext`:**

- All setter functions (`setIsConnected`, `setIsConnecting`, `setAbstraxionError`, `setAbstraxionAccount`, `showModal`, `setShowModal`, `setGranterAddress`, `setDashboardUrl`)

**Added to `AbstraxionContext`:**

- `chainId`, `restUrl`, `signingClient`, `authMode`, `authentication`, `feeGranter`, `indexerUrl`, `indexerAuthToken`, `treasuryIndexerUrl`

**Changed:**

- `logout` now async - returns `Promise<void>`
- State values now read-only (derived from controller)

### Removed Exports

- `Abstraxion` component
- `abstraxionAuth` singleton
- `useModal` hook

### Migration Guide

1. **Update provider:**

   ```tsx
   <AbstraxionProvider config={{ chainId: "xion-testnet-1", contracts }} />
   ```

2. **Remove CSS import:**

   ```tsx
   // Remove: import "@burnt-labs/abstraxion/dist/index.css";
   ```

3. **Replace useModal:**

   ```tsx
   // Use login from useAbstraxionAccount instead
   const { login } = useAbstraxionAccount();
   ```

4. **Update hook usage:**

   ```tsx
   const { client, signArb } = useAbstraxionSigningClient();
   const { logout } = useAbstraxionAccount();
   ```

5. **Choose authentication mode:**

   ```tsx
   // Auto (recommended) — popup on desktop, redirect on mobile
   authentication: { type: "auto" }

   // Popup only
   authentication: { type: "popup" }

   // Inline iframe
   authentication: { type: "iframe" }

   // Signer mode for custom auth (MetaMask, Turnkey, Privy, etc.)
   authentication: { type: "signer", aaApiUrl: "...", getSignerConfig: ..., smartAccountContract: ... }
   ```

6. **Optional — use direct signing for security-critical operations:**

   ```tsx
   const { client } = useAbstraxionSigningClient({ requireAuth: true });
   ```

### Signer Mode — wrap MetaMask/Keplr/Turnkey/Privy directly (no dashboard)

Signer mode connects external wallets (MetaMask, Keplr, OKX) or auth providers (Turnkey, Privy, Web3Auth) **without any reliance on the dashboard or social logins**. The user's wallet or auth provider key is the authenticator — the SDK creates a XION smart account (meta-account) backed by that key.

This is the mode to use when you want full control over authentication and don't want users routed through the XION dashboard at all.

```tsx
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    feeGranter: "xion1...",
    authentication: {
      type: "signer",
      aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
      getSignerConfig: async () => {
        // Return a signer from any provider: Turnkey, Privy, Web3Auth, MetaMask, Keplr, etc.
        const signer = await yourAuthProvider.getSigner();
        return {
          authenticatorId: "...",
          authenticatorType: AUTHENTICATOR_TYPE.SECP256K1,
          account: signer,
        };
      },
      smartAccountContract: {
        codeId: 12,
        checksum: "abc123...",
        addressPrefix: "xion",
      },
      indexer: {
        type: "numia",
        url: "https://xion-testnet.numia.xyz",
        authToken: "...",
      },
    },
  }}
/>
```

**Indexer support:** Numia and Subquery indexers enable fast account discovery in signer mode. DaoDao treasury indexer handles grant config queries. Falls back to RPC if no indexer configured.

> **Demo:** See [`apps/demo-app/src/app/signer-mode/`](apps/demo-app/src/app/signer-mode/) and [`apps/demo-app/src/app/direct-signing-demo/`](apps/demo-app/src/app/direct-signing-demo/) for MetaMask integration.

---

## @burnt-labs/abstraxion-core (previous version)

### Major Changes

- Connector architecture and AA API v2 integration

  ### Connector System

  New connector-based architecture for flexible authentication:

  ```typescript
  export interface Connector {
    type: ConnectorType;
    metadata: ConnectorMetadata;
    connect(): Promise<ConnectorConnectionResult>;
    disconnect(): Promise<void>;
  }

  export class ExternalSignerConnector implements Connector { ... }
  export class ConnectorRegistry { ... }
  ```

  ### AA API v2 Client
  - New `api/client.ts` - HTTP client for AA API v2
  - New `api/createAccount.ts` - Account creation utilities
  - Supports both POST and GET account creation methods

  ### Configuration Validation
  - New `config/validation.ts` - Configuration schema validation
  - Type-safe configuration with runtime checks

  ### New exports
  - Connectors: `Connector`, `ConnectorType`, `ConnectorMetadata`, `ConnectorConfig`, `ConnectorConnectionResult`, `ExternalSignerConnector`, `ConnectorRegistry`
  - API utilities: `createAAClient`, `createAccount`
  - Configuration: `validateConfig`
  - Config utilities: `fetchConfig`, `clearConfigCache`

---

## @burnt-labs/signers (previous version)

### Major Changes

- **Package un-deprecated** — now actively maintained

  ### Passkey Signer Support
  - New `AAPasskeySigner` for WebAuthn/passkey authentication

  ### Signer Factory
  - `createSignerFromSigningFunction` utility for custom signer creation

  ### Crypto Utilities
  - Exported crypto utilities for smart account creation (address generation, salt generation, signatures)

  ### AA API v2 Support
  - New API types for Account Abstraction API v2 interactions

  ### New exports
  - `AAPasskeySigner`, `createSignerFromSigningFunction`, `CreateSignerParams`
  - Crypto utilities: `crypto/*`
  - API types: `api/types`

  ### Removed
  - Query utilities (`interfaces/queries.ts`) — moved to other packages
  - Fragment utilities (`interfaces/fragments.ts`)

---

## @burnt-labs/constants (previous version)

### Minor Changes

- Synchronous chain configuration utilities and fee granter support

  ```typescript
  getChainInfo(chainId: string): ChainInfo | undefined
  getFeeGranter(chainId: string): string
  getRpcUrl(chainId: string): string | undefined
  getRestUrl(chainId: string): string | undefined
  ```

  Fee granter addresses for supported networks:
  - `xion-mainnet-1`: `xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0`
  - `xion-testnet-2`: `xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x`
