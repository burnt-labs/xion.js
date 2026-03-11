# xion.js Version Overview - UNRELEASED

This document contains a comprehensive overview of all manual changelog entries for the upcoming release across all packages in the xion.js monorepo.

The document is split into two sections:
1. **New in this version** — new authentication modes, direct signing, and UX improvements
2. **Breaking changes from previous version** — migration guide for upgrading from the old API

---

# New in This Version

## Authentication Modes

The SDK now supports five authentication modes. All are configured via the `authentication` field on `AbstraxionProvider` config. For popup, redirect, auto, and iframe modes the auth app URL defaults to the chain-specific dashboard URL (fetched from the chain's RPC config at runtime for popup/redirect, or from `@burnt-labs/constants` for iframe). You only need to provide `authAppUrl` or `iframeUrl` if you're overriding for local development or a custom deployment.

### Auto Mode (recommended for most dApps)

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

### Popup Mode

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

### Redirect Mode

Traditional dashboard OAuth flow — navigates the full page to the auth app and returns with `?granted=true`. Default if no `authentication` config is provided.

```tsx
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-1",
    authentication: {
      type: "redirect",
      callbackUrl: "https://myapp.com/callback", // optional, defaults to current page
    },
  }}
/>
```

### Inline Iframe Mode

Embeds the full dashboard inside an iframe on your page. The user authenticates and approves grants without leaving your layout. You control the iframe's position and size via a container element.

The `iframeUrl` defaults to the chain-specific iframe URL from `@burnt-labs/constants` (e.g. `https://settings.testnet.burnt.com/iframe` for testnet-1, `https://auth.testnet.burnt.com/iframe` for testnet-2).

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
import { AbstraxionContext, IframeController, useAbstraxionAccount } from "@burnt-labs/abstraxion";
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

### Signer Mode (wrap MetaMask/Keplr directly — no dashboard)

Signer mode lets you connect external wallets (MetaMask, Keplr, OKX) or auth providers (Turnkey, Privy, Web3Auth) **without any reliance on the dashboard or social logins**. The user's wallet is the authenticator — the SDK creates a XION smart account (meta-account) backed by that wallet's key.

This is the mode to use when you want to wrap an existing wallet directly into the XION account abstraction system.

```tsx
// Example: MetaMask as the authenticator
<AbstraxionProvider
  config={{
    chainId: "xion-testnet-2",
    treasury: "xion1...",
    feeGranter: "xion1...",
    authentication: {
      type: "signer",
      aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
      getSignerConfig: async () => {
        // This function is called when the user connects.
        // Return the wallet's signing function and authenticator details.
        const signer = await yourWalletProvider.getSigner();
        return {
          authenticatorId: "...",
          authenticatorType: AUTHENTICATOR_TYPE.SECP256K1, // or ETH_WALLET
          account: signer,
        };
      },
      smartAccountContract: {
        codeId: 12,
        checksum: "abc123...",
        addressPrefix: "xion",
      },
      // Optional indexers for fast account discovery
      indexer: {
        type: "numia", // or "subquery"
        url: "https://xion-testnet.numia.xyz",
        authToken: "...",
      },
    },
  }}
/>
```

**What happens under the hood:**
1. User connects their wallet (e.g. MetaMask)
2. SDK calls your `getSignerConfig()` to get the signing function
3. SDK discovers or creates a XION smart account (meta-account) for that wallet
4. Session key generated + grants created for gasless session-key transactions
5. For direct signing (`requireAuth: true`), the wallet is prompted directly — MetaMask popup appears for each tx

See the `direct-signing-demo` in `apps/demo-app/` for a full working example with MetaMask.

---

## Direct Signing (`requireAuth: true`)

All modes support **direct signing** alongside the default session-key signing. Pass `{ requireAuth: true }` to `useAbstraxionSigningClient` to get a client where **the user's meta-account signs each transaction directly** — not the session key.

### Key differences from session-key signing

| Aspect | Session Key (default) | Direct Signing (`requireAuth: true`) |
|--------|----------------------|--------------------------------------|
| **Who signs** | Session keypair (grantee) | Meta-account directly (user's wallet or dashboard authenticator) |
| **On-chain signer** | Grantee address via Authz Exec | Meta-account address directly |
| **User interaction** | Silent — no prompts | Explicit approval required per transaction |
| **Gas payment** | Fee grant (gasless for the user) | **User pays gas from their meta-account XION balance** |
| **Balance requirement** | None (fee grant covers gas) | **Meta-account must hold XION to pay gas fees** |
| **Use case** | Normal operations | Security-critical operations |

### Important: gas fees and balance

Direct signing does **not** use fee grants. The user's meta-account must have a XION balance to pay transaction gas fees. If the meta-account has insufficient balance, the transaction will fail. On testnet, users can get tokens from the [XION faucet](https://faucet.xion.burnt.com/).

### Code pattern

Both clients expose the same API, so switching is a one-line change:

```tsx
// Session key — silent, gasless, signed by grantee keypair
const { client } = useAbstraxionSigningClient();

// Direct — meta-account signs directly, user approves, user pays gas
const { client: directClient, error } = useAbstraxionSigningClient({ requireAuth: true });

// Same API for both:
await client.sendTokens(from, to, amount, "auto", memo);
await client.signAndBroadcast(address, messages, "auto", memo);
```

### Client type by authentication mode

| Auth Mode | Session Key Client | Direct Signing Client | Approval UX |
|-----------|-------------------|-----------------------|-------------|
| redirect  | `GranteeSignerClient` | `RedirectSigningClient` | Redirects to dashboard for approval |
| popup / auto | `GranteeSignerClient` | `PopupSigningClient` | Opens dashboard popup for approval |
| iframe    | `GranteeSignerClient` | `IframeSigningClient` | User approves inside embedded iframe |
| signer    | `GranteeSignerClient` | `AAClient` | Wallet prompts directly (MetaMask popup, Keplr prompt, etc.) |

### When to use direct signing

- Security-critical operations (large withdrawals, changing account permissions)
- Operations that should require explicit user confirmation
- When the on-chain signer must be the meta-account itself (not a grantee)
- When you need a verifiable on-chain signature from the user's actual account

### When to use session key signing (default)

- Normal operations (transfers, mints, swaps, contract calls)
- High-frequency operations that should be seamless
- When gasless UX is important (fee grants cover gas)

---

## New Exports

**Config types:**
- `AbstraxionConfig`, `NormalizedAbstraxionConfig`, `AuthenticationConfig`
- `RedirectAuthentication`, `PopupAuthentication`, `AutoAuthentication`, `IframeAuthentication`, `SignerAuthentication`

**Signing clients:**
- `PopupSigningClient`, `RedirectSigningClient`, `IframeSigningClient`

**Controller:**
- `IframeController` (for `instanceof` checks when setting container element)

**Utilities:**
- `isMobileOrStandalone()` — device detection used by auto mode

**Re-exported:**
- `Connector`, `ConnectorType`, `AUTHENTICATOR_TYPE`, `OfflineDirectSigner`

---

## Controller Architecture

- New controller pattern with state machine for connection lifecycle
- `RedirectController` for OAuth redirect flow
- `PopupController` for popup-based OAuth flow
- `IframeController` for inline iframe flow with `MessageChannelManager`
- `SignerController` for external signers (MetaMask, Keplr, Turnkey, etc.)
- Controller factory auto-selects based on `authentication.type`
- Handles state transitions, session restoration, account creation/discovery

## Indexer Support

- Numia and Subquery indexers for fast account discovery (signer mode)
- DaoDao treasury indexer for fast grant config queries
- Falls back to RPC if no indexer configured

---

# Breaking Changes (from previous version)

## @burnt-labs/abstraxion

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
   // All URLs auto-resolved from chainId — no overrides needed for standard networks
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
   // Meta-account signs directly, user pays gas from their XION balance
   const { client } = useAbstraxionSigningClient({ requireAuth: true });
   ```

---

## @burnt-labs/abstraxion-core

### Major Changes

- Connector architecture and AA API v2 integration

  ## Connector System

  New connector-based architecture for flexible authentication:

  ```typescript
  // Connector types
  export interface Connector {
    type: ConnectorType;
    metadata: ConnectorMetadata;
    connect(): Promise<ConnectorConnectionResult>;
    disconnect(): Promise<void>;
  }

  // External signer connector
  export class ExternalSignerConnector implements Connector {
    // Connect using external auth providers (Turnkey, Privy, etc.)
  }

  // Connector registry
  export class ConnectorRegistry {
    registerConnector(connector: Connector): void;
    getConnector(type: ConnectorType): Connector | undefined;
  }
  ```

  ## AA API v2 Client
  - New `api/client.ts` - HTTP client for AA API v2
  - New `api/createAccount.ts` - Account creation utilities
  - Supports both POST and GET account creation methods
  - Enhanced error handling and validation

  ## Configuration Validation
  - New `config/validation.ts` - Configuration schema validation
  - Type-safe configuration with runtime checks
  - Improved error messages for misconfigurations

  ## Enhanced AbstraxionAuth
  - Improved authentication flow with better state management
  - Support for multiple authentication modes
  - Enhanced grant verification and validation

  ## GranteeSignerClient Improvements
  - Additional utility methods for account management
  - Better integration with connector system
  - Improved error handling

  ## API Changes

  **New exports:**

  ```typescript
  // Connectors
  export * from "./connectors";
  -Connector -
    ConnectorType -
    ConnectorMetadata -
    ConnectorConfig -
    ConnectorConnectionResult -
    ExternalSignerConnector -
    ConnectorRegistry;

  // API utilities
  export * from "./api";
  -createAAClient - createAccount;

  // Configuration
  export * from "./config";
  -validateConfig;

  // Config utilities
  export { fetchConfig, clearConfigCache } from "./utils/configUtils";
  ```

  **Import path fixes:**
  - Fixed relative imports to use correct paths (removed `@/` aliases in exports)

  ## Internal Improvements
  - Enhanced test coverage with mock data utilities
  - Better TypeScript configuration
  - Improved build output with tsup

### Patch Changes

- Updated dependencies:
  - `@burnt-labs/constants@*`

---

## @burnt-labs/signers

### Major Changes

- **Package un-deprecated** - Package is now actively maintained and enhanced with new features

  ## Removed deprecation warnings
  - Package deprecation removed - now actively maintained
  - Console warnings removed

  ## Passkey Signer Support
  - New `AAPasskeySigner` for WebAuthn/passkey authentication
  - Built-in WebAuthn utilities for credential creation and verification

  ## Signer Factory
  - New `createSignerFromSigningFunction` utility for custom signer creation
  - `CreateSignerParams` type for flexible signer configuration
  - Simplifies integration of custom signing functions

  ## Crypto Utilities
  - Exported crypto utilities for smart account creation:
    - Address generation and validation
    - Salt generation for deterministic account addresses
    - Signature utilities
  - Previously internal, now part of public API

  ## AA API v2 Support
  - New API types for Account Abstraction API v2 interactions
  - Enhanced type safety for AA API communication
  - Fee grant types from `abstractaccount/v1`

  ## Enhanced Signers
  - Improved `AADirectSigner` with additional functionality
  - Updated `AAEthSigner` for better Ethereum integration
  - Refined `AbstractAccountJWTSigner` for JWT authentication

  ## API Changes

  **New exports:**
  - `AAPasskeySigner` - WebAuthn/passkey signer
  - `createSignerFromSigningFunction` - Signer factory function
  - `CreateSignerParams` - Factory configuration type
  - Crypto utilities: `crypto/*`
  - API types: `api/types`

  **Removed:**
  - Query utilities (`interfaces/queries.ts`) - moved to other packages
  - Fragment utilities (`interfaces/fragments.ts`)

### Patch Changes

- Updated dependencies

---

## @burnt-labs/constants

### Minor Changes

- Add synchronous chain configuration utilities and fee granter support

  ## Synchronous Chain Info Utilities

  New synchronous alternatives to `fetchConfig()` for when chain ID is already known:

  ```typescript
  // Get chain info by chain ID
  getChainInfo(chainId: string): ChainInfo | undefined

  // Get fee granter address for chain
  getFeeGranter(chainId: string): string

  // Get RPC URL for chain
  getRpcUrl(chainId: string): string | undefined

  // Get REST URL for chain
  getRestUrl(chainId: string): string | undefined
  ```

  ## Fee Granter Configuration
  - Added fee granter addresses for supported networks:
    - `xion-mainnet-1`: `xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0`
    - `xion-testnet-2`: `xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x`
  - `fetchConfig()` now returns `feeGranter` in response

  ## Migration Guide

  Instead of fetching config from RPC when you already have the chain ID:

  ```typescript
  // Before
  const config = await fetchConfig(rpcUrl);
  const restUrl = config.restUrl;

  // After (no async needed)
  const restUrl = getRestUrl(chainId);
  const feeGranter = getFeeGranter(chainId);
  ```

### Patch Changes

- Updated dependencies

---

## Summary

This release represents a major architectural overhaul of the xion.js SDK with:

1. **Five authentication modes** — redirect, popup, auto, iframe, and signer for every UX need
2. **Direct signing** — `requireAuth: true` for security-critical operations where the meta-account signs directly and the user pays gas from their XION balance
3. **Popup & auto mode** — users stay on the dApp page; auto mode picks popup (desktop) or redirect (mobile)
4. **Inline iframe mode** — embed the dashboard inside your page with `MessageChannel`-based communication
5. **Signer mode** — wrap MetaMask, Keplr, Turnkey, Privy directly without dashboard or social logins
6. **Connector-based architecture** — flexible authentication with support for external providers
7. **AA API v2 integration** — enhanced account abstraction API support
8. **Passkey support** — WebAuthn/passkey authentication capabilities
9. **UI separation** — core packages are now UI-less for greater flexibility
10. **Improved developer experience** — better types, error handling, and configuration validation

**Migration Required**: This is a breaking change. Please review the migration guides in each package section above.
