# xion.js Version Overview - UNRELEASED

This document contains a comprehensive overview of all manual changelog entries for the upcoming release across all packages in the xion.js monorepo.

---

## @burnt-labs/abstraxion

### Major Changes

- Complete architecture overhaul with connector-based design and state machine

  # Breaking Changes

  ## Removed Components and UI
  - All UI components removed: `<Abstraxion />`, `<AbstraxionSignin />`, `<Connected />`, `<Loading />`, `<ErrorDisplay />`
  - CSS import no longer needed - package is now UI-less
  - `@burnt-labs/ui` dependency removed
  - `useModal` hook removed - implement your own authentication UI

  ## Configuration Changes

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
        type: "redirect", // or "signer"
        // mode-specific options
      }
    }}
  >
  ```

  **Key changes:**
  - `chainId` now required
  - `rpcUrl`, `restUrl`, `gasPrice` optional (auto-filled)
  - `dashboardUrl` moved to `authentication.dashboardUrl`
  - `callbackUrl` moved to `authentication.callbackUrl`
  - `indexerUrl` moved to `authentication.indexer`

  ## Hook Changes

  **`useAbstraxionSigningClient`:**
  - No longer returns `logout` (moved to `useAbstraxionAccount`)
  - Returns pre-configured `client` from state

  ```tsx
  // Before
  const { client, signArb, logout } = useAbstraxionSigningClient();

  // After
  const { client, signArb } = useAbstraxionSigningClient();
  const { logout } = useAbstraxionAccount();
  await logout(); // now async
  ```

  ## Context Changes

  **Removed from `AbstraxionContext`:**
  - All setter functions (`setIsConnected`, `setIsConnecting`, `setAbstraxionError`, `setAbstraxionAccount`, `showModal`, `setShowModal`, `setGranterAddress`, `setDashboardUrl`)

  **Added to `AbstraxionContext`:**
  - `chainId`, `restUrl`, `signingClient`, `authMode`, `authentication`, `feeGranter`, `indexerUrl`, `indexerAuthToken`, `treasuryIndexerUrl`

  **Changed:**
  - `logout` now async - returns `Promise<void>`
  - State values now read-only (derived from controller)

  ## Export Changes

  **Removed:**
  - `Abstraxion` component
  - `abstraxionAuth` singleton
  - `useModal` hook

  **Added:**
  - New config types: `AbstraxionConfig`, `NormalizedAbstraxionConfig`, `AuthenticationConfig`, `RedirectAuthentication`, `SignerAuthentication`
  - Re-exported: `Connector`, `ConnectorType`, `AUTHENTICATOR_TYPE`, `OfflineDirectSigner`

  # New Features

  ## Signer Mode

  New authentication mode supporting external providers (Turnkey, Privy, Web3Auth) and direct wallet connections (MetaMask, Keplr) without dashboard redirect:

  ```tsx
  <AbstraxionProvider
    config={{
      chainId: "xion-testnet-2",
      authentication: {
        type: "signer",
        aaApiUrl: "https://aa-api......com",
        getSignerConfig: async () => {
          const signer = await yourAuthProvider.getSigner();
          return {
            authenticatorId: "...",
            authenticatorType: AUTHENTICATOR_TYPE.SECP256K1,
            account: signer,
          };
        },
        smartAccountContract: {
          codeId: 12,
          salt: "0",
          msg: {},
        },
        // Optional indexers for fast queries
        indexer: {
          type: "numia", // or "subquery"
          url: "https://xion-testnet.numia.xyz",
          authToken: "...",
        },
        treasuryIndexer: {
          url: "https://indexer.daodao.zone",
        },
      },
    }}
  />
  ```

  ## Redirect Mode

  Traditional dashboard OAuth flow still supported (default if no `authentication` config):

  ```tsx
  <AbstraxionProvider
    config={{
      chainId: "xion-testnet-1",
      authentication: {
        type: "redirect",
        // dashboardUrl auto-fetched for standard networks
        callbackUrl: "http://localhost:3000/callback",
      },
    }}
  />
  ```

  ## Controller Architecture
  - New controller pattern with state machine for connection lifecycle
  - `RedirectController` for OAuth flow
  - `SignerController` for external signers
  - Handles state transitions, session restoration, account creation/discovery

  ## Indexer Support
  - Numia and Subquery indexers for fast account discovery (signer mode)
  - DaoDao treasury indexer for fast grant config queries
  - Falls back to RPC if no indexer configured

  # Migration Guide
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

  5. **Optional - implement signer mode for custom auth**

---

## @burnt-labs/abstraxion-core

### Major Changes

- Connector architecture and AA API v2 integration

  # New Features

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

  # API Changes

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

  # Internal Improvements
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

  # Breaking Changes

  ## Removed deprecation warnings
  - Package deprecation removed - now actively maintained
  - Console warnings removed

  # New Features

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

  # API Changes

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

  # New Features

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

  # Migration Guide

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

1. **Connector-based architecture** - More flexible authentication with support for external providers
2. **Signer mode** - New authentication mode bypassing dashboard redirect flow
3. **AA API v2 integration** - Enhanced account abstraction API support
4. **Passkey support** - WebAuthn/passkey authentication capabilities
5. **UI separation** - Core packages are now UI-less for greater flexibility
6. **Improved developer experience** - Better types, error handling, and configuration validation

**Migration Required**: This is a breaking change. Please review the migration guides in each package section above.
