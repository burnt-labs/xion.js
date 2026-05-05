# @burnt-labs/abstraxion-core

## 1.0.0-alpha.70

### Patch Changes

- Updated dependencies [[`6b6a907`](https://github.com/burnt-labs/xion.js/commit/6b6a907230b6c56d151e88a6b7371e13379bd19a)]:
  - @burnt-labs/signers@1.0.0-alpha.9

## 1.0.0-alpha.69

### Minor Changes

- [#355](https://github.com/burnt-labs/xion.js/pull/355) [`e466751`](https://github.com/burnt-labs/xion.js/commit/e46675174d71aabd6ff24cc59016713938168ea2) Thanks [@ertemann](https://github.com/ertemann)! - Adopt `@burnt-labs/xion-types` as the source of truth for protobuf and contract types, consolidate the popup/redirect/iframe signing clients into a single `RequireSigningClient`, expose the manage-authenticators flow through the SDK, and tighten the SDK ↔ Dashboard message contract.

  ## Breaking changes (`@burnt-labs/abstraxion-core`)
  - **`IframeMessageType.ADD_AUTHENTICATORS`** and the `DashboardMessageType.ADD_AUTHENTICATORS_*` enum values have been **renamed** to `MANAGE_AUTHENTICATORS` / `MANAGE_AUTHENTICATORS_*` with no backward-compat aliases. These enums are the wire contract between the SDK and the Abstraxion Dashboard; the dashboard bundle on testnet/mainnet must be redeployed before this SDK version is published. The contract probe in `packages/abstraxion/tests/integration/message-contract.integration.test.ts` is the canonical pre-release gate.
  - **`PopupSigningClient`, `RedirectSigningClient`, and `IframeSigningClient` have been removed** and replaced by a single `RequireSigningClient` that handles all three transports behind one interface, including proper transaction simulation. Consumers that imported the per-mode clients directly must switch to `RequireSigningClient`.
  - **Protobuf types are no longer vendored.** All manually generated/kept protobuf and contract types have been removed in favor of `@burnt-labs/xion-types`. Consumers importing protobuf message types from `abstraxion-core` internals must import from `@burnt-labs/xion-types` instead.

  ## Migration to `@burnt-labs/xion-types`
  - `@burnt-labs/xion-types` is pinned to `29.0.0-rc1` across all packages (pnpm override + per-package `dependencies`).
  - `@burnt-labs/signers`: imports `AbstractAccount` and `MsgRegisterAccount` from `xion-types` subpaths; `uint64FromProto` widened to accept `Long | bigint` for cross-boundary compat.
  - `@burnt-labs/account-management`: `GrantConfigByTypeUrl` now extends `GrantConfig` from `xion-types`; the local `Any` interface has been removed and `TreasuryAny` from `xion-types` is used instead. `Params` is re-exported as `TreasuryParamsV2` for forward-compat with the upcoming chain upgrade.
  - `@burnt-labs/abstraxion-core`: adds a `ChainGrant` interface and uses `import type` for authz types from `xion-types`.

  ## New public API — Manage Authenticators flow (`@burnt-labs/abstraxion`)
  - **`useManageAuthenticators()`** — new hook that opens the dashboard manage-authenticators flow (add or remove) in popup, iframe (embedded), and redirect modes. Returns `{ manageAuthenticators, isSupported, manageAuthResult, clearManageAuthResult }`.
  - **`ManageAuthResult`** — exported type for the redirect-mode result (`{ success: true } | { success: false; error: string }`).
  - **`UseManageAuthenticatorsReturn`** — type export for the hook's return shape.

  ## SDK internals (`@burnt-labs/abstraxion-core`)
  - `PopupController.promptManageAuthenticators(signerAddress)` — opens a popup to the dashboard `manage-authenticators` view; resolves on `MANAGE_AUTHENTICATORS_SUCCESS`, rejects on cancel/error. Timeout: 10 min.
  - `IframeController.promptManageAuthenticators(signerAddress)` — sends `MANAGE_AUTHENTICATORS` via `MessageChannelManager` to the embedded iframe; resolves when the user completes the flow.
  - `RedirectController.promptManageAuthenticators(signerAddress)` — navigates to the dashboard manage-auth page; result available via `manageAuthResult` store after return.
  - `RedirectController.manageAuthResult` — new `ResultStore<ManageAuthResult>` (parallel to `signResult`). Subscribe, snapshot, and clear follow the same `useSyncExternalStore`-compatible pattern.
  - `waitForPopupMessage<T>` — shared private helper in `PopupController` that eliminates duplicated popup-message-waiting boilerplate across sign and manage-auth flows.
  - `DashboardMessageType` — three new enum values: `MANAGE_AUTHENTICATORS_SUCCESS`, `MANAGE_AUTHENTICATORS_REJECTED`, `MANAGE_AUTHENTICATORS_ERROR`.

  ## Direct grant decoding pipeline (`@burnt-labs/abstraxion-core`)
  - `fetchChainGrantsDecoded()` decodes chain grants directly from protobuf, eliminating the REST intermediate step that caused multiple session-invalidation bugs (#290, #336).
  - `compareChainGrantsToTreasuryGrants` now returns a typed `GrantComparisonResult` with reasons (`grant_missing`, `grant_mismatch`, `decode_error`); `decode_error` is non-fatal — session is preserved and a warning is logged.
  - Unknown limit/filter type URLs preserve raw bytes and fall back to byte-level comparison instead of returning `false`.
  - `decodeAuthorization` is wrapped in try/catch — corrupted bytes return `Unsupported` instead of throwing, preventing malformed treasury data from crashing session restore.

  ## TX payload utilities (`@burnt-labs/signers`)
  - **`validateTxPayload(payload, context)`** — pre-flight validation for transaction payloads before encoding/transport; logs issues without throwing so dev mistakes surface early.
  - **`normalizeMessages(messages)`** — dashboard-side normalization that converts post-JSON-transport CosmWasm `msg` fields from plain objects back to `Uint8Array` for protobuf encoding.
  - **`TxTransportPayload`** — shared type for the wire format used by popup, redirect, and iframe signing flows.
  - **`getTreasuryParamsMetadata(params)`** — backward-compat helper that returns `metadata` with fallback to `display_url` for pre-upgrade indexer responses.
  - Coins are sorted in grant encoding for deterministic comparison.
  - `NilPubKey` protobuf encoding fixed.
  - `AAClient` upgraded from `Tendermint37Client` to `Comet38Client` for consistency with `GranteeSignerClient`/`rpcClient` and proper CometBFT 0.38+ support.
  - `MsgInstantiateContract2` validation fixed.

  ## DaoDAO indexer typing (`@burnt-labs/signers`)
  - Generated typed API paths from the DaoDAO indexer OpenAPI spec.
  - Manually maintained response types with runtime type guards.
  - `xion-types` compatibility test for bigint boundary validation.
  - New scripts: `generate:daodao-indexer-types`, `generate:daodao-indexer-types:local`.

  ## Treasury strategy improvements (`@burnt-labs/account-management`)
  - `CompositeTreasuryStrategy` gains a racing mode (`Promise.any()` parallel execution) that resolves on first success, eliminating waits for slow DAODAO indexer timeouts. Constructor signature changed to `(strategies[], options)`.
  - DAODAO indexer treasury strategy is end-to-end typed against the generated indexer schema.

  ## Refactors
  - `resolveAuthAppUrl` and `buildDashboardUrl` extracted to `controllers/utils.ts`; used by both `PopupController` and `RedirectController`, removing duplicated `fetchConfig` call sites.
  - `ResultStore<T>` in `RedirectController` replaces the bespoke `signResult_` / `signResultSubscribers_` pattern, making both sign and manage-auth results consistent.

  ## Constants (`@burnt-labs/constants`)
  - Mainnet dashboard / iframe URL changed from `https://settings.mainnet.burnt.com` to `https://settings.burnt.com`.

### Patch Changes

- Updated dependencies [[`e466751`](https://github.com/burnt-labs/xion.js/commit/e46675174d71aabd6ff24cc59016713938168ea2)]:
  - @burnt-labs/signers@1.0.0-alpha.8
  - @burnt-labs/constants@0.1.0-alpha.24

## 1.0.0-alpha.68

### Minor Changes

- [#340](https://github.com/burnt-labs/xion.js/pull/340) [`1a387ca`](https://github.com/burnt-labs/xion.js/commit/1a387cabe46a20c6a88fc32e51c8f88f99ccddf1) Thanks [@ertemann](https://github.com/ertemann)! - Add embedded wallets with popup, auto, and embedded authentication modes. Also add direct signing (`requireAuth`) for transactions that need meta-account authorization instead of session keys.

  ## What's new
  - **Popup mode** — opens auth app in a popup window; user stays on the dApp page, popup closes on success
  - **Auto mode** — automatically picks popup (desktop) or redirect (mobile/PWA) based on device detection
  - **Embedded mode** (`type: "embedded"`) — embeds dashboard inside your page via `MessageChannel`-based communication. New `<AbstraxionEmbed>` drop-in component handles all wiring — just place it in your layout and use hooks like any other mode
  - **Direct signing (`requireAuth: true`)** — meta-account signs transactions directly instead of using session keys; user pays gas from their XION balance. For txs that won't be secure using session keys, like big transfers, smart account management etc.
  - **`isDisconnected` flag** — `useAbstraxionAccount` now returns `isDisconnected: boolean`, true only after an explicit user logout. Prevents `<AbstraxionEmbed autoConnect>` from silently re-authenticating after logout
  - **`isAwaitingApproval` flag** — context exposes `isAwaitingApproval: boolean`, true while a `requireAuth` signing request is pending and the iframe needs to be visible

  Non user facing:
  - **Signing clients per auth mode** — `PopupSigningClient`, `RedirectSigningClient`, `IframeSigningClient` for direct signing in each mode
  - **`resolveAutoAuth` utility** — mobile/standalone detection heuristic (user-agent, touch, viewport, orientation, PWA)
  - **Wrong-wallet signing guard** — prevents signing from a wallet that doesn't match the connected account
  - **UTF-8-safe base64 encoding** — `toBase64`/`fromBase64` in `@burnt-labs/signers` for safe encoding of Unicode payloads (emoji, non-Latin scripts)
  - **Treasury grant restoration fix** — handles ABCI REST format change that broke session restoration (`decodeRestFormatAuthorization` in abstraxion-core)
  - **Embedded URL constants** — `getIframeUrl(chainId)` added to `@burnt-labs/constants` for per-chain dashboard URLs
  - **New core exports** — `MessageChannelManager`, `TypedEventEmitter`, `IframeMessageType`, `MessageTarget` from abstraxion-core; `AAClient`, `IframeController` from abstraxion
  - **`disconnected` state in account state machine** — new `AccountState` status distinct from `idle`, set only after an explicit logout. New `EXPLICITLY_DISCONNECTED` action and `AccountStateGuards.isDisconnected()` type guard. All four controllers dispatch this instead of `RESET` on disconnect
  - **`authMode` derived from controller instance** — `AbstraxionProvider` now derives `authMode` from the live controller type instead of re-running `resolveAutoAuth` on every render, preventing SSR/client hydration mismatches and viewport-resize flips

  ## AbstraxionEmbed redesign

  `<AbstraxionEmbed>` has been redesigned with full lifecycle control props replacing the single `autoConnect` boolean:
  - **`idleView`** (`"button" | "fullview" | "hidden"`, default `"button"`) — what to show before the user logs in
  - **`disconnectedView`** (same options, default: same as `idleView`) — what to show after an explicit logout
  - **`connectedView`** (`"hidden" | "visible"`, default `"hidden"`) — whether to keep the iframe visible after connecting
  - **`approvalView`** (`"modal" | "inline"`, default `"modal"`) — how to display the iframe when a `requireAuth` signing request is pending
  - **`loginLabel`**, **`loginButtonClassName`**, **`loginButtonStyle`** — customise the login button
  - **`modalClassName`**, **`modalStyle`** — customise the approval modal wrapper

  ## Dashboard changes (xion-dashboard-app `feat/embedded-wallets`)

  These dashboard changes are required for the new SDK modes to work:
  - **Popup mode support** — dashboard can now run inside a popup window opened by the SDK, communicating auth results back via `postMessage` and closing automatically on success
  - **Redirect-within-popup for OAuth** — when using popup mode, OAuth providers (Stytch) redirect inside the popup instead of opening yet another popup
  - **SignTransactionView** — new view for approving individual transactions sent via `requireAuth` / direct signing (popup, redirect, and embedded modes)
  - **Embedded mode** — dashboard renders inside an iframe with transparent background; old `IframeApp/` components removed in favor of the main app with `?iframe=true` search param
  - **LoginConnectConfirm** — new approval screen for no-grant-config flows (empty treasury or direct-signing-only grantee); shows app branding and "Connect / Deny / Use a different account"
  - **Empty treasury support** — treasury address present but no grant configs no longer throws; dashboard routes to `LoginConnectConfirm` instead of `LoginGrantApproval`
  - **SDK-only disconnect** — disconnect from the SDK side sends `HARD_DISCONNECT` and tears down the iframe; "Use a different account" stays within the iframe (no parent notification) so the user can re-login without a white-screen flash
  - **`switchAccount()`** hook function — new export from `useXionDisconnect`; clears session locally without notifying parent, used by "Use a different account" buttons
  - **Origin validation on callbacks** — `postMessage` origin checks upgraded for security in embedded/popup communication
  - **Wrong-address signing guard** — dashboard rejects signing requests if the requested signer doesn't match the logged-in account

  ## Packages changed
  - **`@burnt-labs/abstraxion`** — new `<AbstraxionEmbed>` component (redesigned), new controllers (`PopupController`, `IframeController`), signing clients, auto mode resolution, expanded `useAbstraxionSigningClient` with `requireAuth` support, `isDisconnected`/`isAwaitingApproval` context values, `authMode` derived from controller instance, new type exports (`EmbeddedAuthentication`, `PopupAuthentication`, `AutoAuthentication`, `SignResult`, `SigningClient`)
  - **`@burnt-labs/abstraxion-core`** — `MessageChannelManager`, `TypedEventEmitter`, iframe message types, `decodeRestFormatAuthorization` grant decoding, treasury grant restoration fix
  - **`@burnt-labs/account-management`** — `disconnected` account state, `EXPLICITLY_DISCONNECTED` action, `AccountStateGuards.isDisconnected()` type guard
  - **`@burnt-labs/constants`** — `getIframeUrl(chainId)`, per-chain dashboard URL constants for mainnet/testnet
  - **`@burnt-labs/signers`** — `toBase64`/`fromBase64` encoding utils, `ZKEmail` authenticator type support
  - **`demo-app`** — new demos: `popup-demo/`, `embedded-dynamic/`, `embedded-inline/`, `direct-signing-demo/` (with MetaMask via `useMetamask` hook); removed old `inline-demo/`

  For full details, usage examples, and migration guide see [`LATEST_VERSION_OVERVIEW.md`](../LATEST_VERSION_OVERVIEW.md) and the demo apps in [`apps/demo-app/`](../apps/demo-app/).

### Patch Changes

- Updated dependencies [[`1a387ca`](https://github.com/burnt-labs/xion.js/commit/1a387cabe46a20c6a88fc32e51c8f88f99ccddf1)]:
  - @burnt-labs/constants@0.1.0-alpha.23
  - @burnt-labs/signers@1.0.0-alpha.7

## 1.0.0-alpha.67

### Patch Changes

- Updated dependencies [[`847ad14`](https://github.com/burnt-labs/xion.js/commit/847ad14b0d6c75f9f3272723176638ac246c4597)]:
  - @burnt-labs/constants@0.1.0-alpha.22
  - @burnt-labs/signers@1.0.0-alpha.6

## 1.0.0-alpha.66

### Patch Changes

- [#335](https://github.com/burnt-labs/xion.js/pull/335) [`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114) Thanks [@ertemann](https://github.com/ertemann)! - Consolidate some more code, add cache for treasury to better serve dashboard

- Updated dependencies [[`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114), [`70481a8`](https://github.com/burnt-labs/xion.js/commit/70481a85beba828767f71f6b7eb1374e2ceee0bc)]:
  - @burnt-labs/constants@0.1.0-alpha.21
  - @burnt-labs/signers@1.0.0-alpha.5

## 1.0.0-alpha.65

### Patch Changes

- [#336](https://github.com/burnt-labs/xion.js/pull/336) [`00fb815`](https://github.com/burnt-labs/xion.js/commit/00fb815df96b5707714dfd4bfe9f39d636c8b5b1) Thanks [@BurntSpooky](https://github.com/BurntSpooky)! - fix(abstraxion-core): decode ABCI grants to REST format for legacy validation

## 1.0.0-alpha.64

### Patch Changes

- [#332](https://github.com/burnt-labs/xion.js/pull/332) [`4b572f0`](https://github.com/burnt-labs/xion.js/commit/4b572f0937ce567ea40868b6b63987d933f6ca9a) Thanks [@ertemann](https://github.com/ertemann)! - Additions and cleanup from dashboard migration

- Updated dependencies [[`4b572f0`](https://github.com/burnt-labs/xion.js/commit/4b572f0937ce567ea40868b6b63987d933f6ca9a)]:
  - @burnt-labs/signers@1.0.0-alpha.4

## 1.0.0-alpha.63

### Patch Changes

- Updated dependencies [[`45e3a7b`](https://github.com/burnt-labs/xion.js/commit/45e3a7b6cb83b5fb812a382e09073285f32303d5)]:
  - @burnt-labs/signers@1.0.0-alpha.3

## 1.0.0-alpha.62

### Minor Changes

- [#314](https://github.com/burnt-labs/xion.js/pull/314) [`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9) Thanks [@ertemann](https://github.com/ertemann)! - This release introduces **Signer Mode**, allowing users to connect with external wallets (MetaMask, Keplr, OKX, Turnkey, etc.) without requiring dashboard redirects. We've also refactored Abstraxion with a new connector-based architecture for better flexibility and extensibility. The release includes automatic configuration defaults (rpcUrl, restUrl, gasPrice are now inferred from chainId), migration to AA API V2, and two new packages: `@burnt-labs/account-management` and `@burnt-labs/signers`. Indexer support has been added for fast account discovery using Numia, Subquery, and DaoDao indexers. The Direct Signer Mode has been removed in favor of the new Signer Mode. Existing redirect mode users require no changes, while signer mode users need to add an `authentication` config with `type: "signer"`, `aaApiUrl`, `getSignerConfig()`, and `smartAccountContract` settings.

### Patch Changes

- Updated dependencies [[`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9)]:
  - @burnt-labs/constants@0.1.0-alpha.20
  - @burnt-labs/signers@1.0.0-alpha.2

## 1.0.0-alpha.61

### Minor Changes

- [#316](https://github.com/burnt-labs/xion.js/pull/316) [`0a7eb51`](https://github.com/burnt-labs/xion.js/commit/0a7eb5105e15494e9aa9b9397b99324067217435) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix React Native Authentication Callback Flow

### Patch Changes

- [#317](https://github.com/burnt-labs/xion.js/pull/317) [`79ee437`](https://github.com/burnt-labs/xion.js/commit/79ee437c11d45bdc877f6d232248bc555e22fd05) Thanks [@btspoony](https://github.com/btspoony)! - Core changes:
  - Added gas price configuration to the AbstraxionAuth's getSigner method

## 1.0.0-alpha.60

### Major Changes

- [#305](https://github.com/burnt-labs/xion.js/pull/305) [`1fe18d9`](https://github.com/burnt-labs/xion.js/commit/1fe18d970666b0c448427fda55d5e7764059174b) Thanks [@BurntVal](https://github.com/BurntVal)! - # Breaking Changes

  ## React Native Crypto Setup Required

  ### What Changed
  - Added React Native support with `quickCrypto` fallback for KDF operations
  - Made `executeKdf` method static in `SignArbSecp256k1HdWallet`
  - Made `createWithSigner` method synchronous (removed async/await)

  ### Migration Guide

  #### For React Native Apps

  You must now install and configure crypto dependencies:

  ```bash
  npm install react-native-get-random-values react-native-quick-crypto
  ```

  Add this to your app's entry point (before any Abstraxion imports):

  ```typescript
  import "react-native-get-random-values";
  import crypto from "react-native-quick-crypto";

  // Set up global crypto for React Native
  if (
    typeof global !== "undefined" &&
    global.navigator?.product === "ReactNative"
  ) {
    global.quickCrypto = crypto;
  }
  ```

  #### For Web Apps

  No changes required - existing functionality remains the same.

### Patch Changes

- Updated dependencies [[`1fe18d9`](https://github.com/burnt-labs/xion.js/commit/1fe18d970666b0c448427fda55d5e7764059174b)]:
  - @burnt-labs/constants@0.1.0-alpha.19

## 1.0.0-alpha.59

### Minor Changes

- [#296](https://github.com/burnt-labs/xion.js/pull/296) [`82e2876`](https://github.com/burnt-labs/xion.js/commit/82e28763ca97805cc6d24b0402af2a2b28f56bf1) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove rest_url param from provider

- [#291](https://github.com/burnt-labs/xion.js/pull/291) [`e88eca8`](https://github.com/burnt-labs/xion.js/commit/e88eca8d15714d9c0e266f9fccc009610e9f353c) Thanks [@justinbarry](https://github.com/justinbarry)! - - **RPC Configuration:**
  - Added caching with 5-minute TTL to RPC config fetches, reducing redundant network requests
  - Added `clearConfigCache()` function for manual cache invalidation
  - **Treasury Grant Data:**
    - Introduced caching with 10-minute TTL for treasury data fetches
    - Added new function to fetch treasury grant data directly from the DaoDao indexer
    - Indexer URL is now configurable via `indexerUrl` parameter in provider configuration
    - Unified and simplified the treasury grant config API with improved fallback mechanisms
    - Added response validation for indexer data with proper type checking
    - Added `clearTreasuryCache()` function for manual cache invalidation
  - **Error Handling:**
    - Added specific error types: `TreasuryError`, `IndexerError`, `IndexerNetworkError`, `IndexerResponseError`, `TreasuryConfigError`, and `TreasuryValidationError`
    - Improved error logging with contextual information (status codes, URLs)
  - **Authentication:**
    - Fixed race condition in authentication with proper Promise-based queueing
    - Multiple concurrent authentication attempts now properly wait for the first to complete
  - **Refactoring:**
    - Replaced direct CosmWasmClient usage with a modular RPC client utility to eliminate RPC `status` calls on startup
    - Simplified deprecated functions to delegate to the new unified `getTreasuryGrantConfigs` function
    - Cleaned up and reorganized imports for better code clarity

### Patch Changes

- [#306](https://github.com/burnt-labs/xion.js/pull/306) [`fa64a3f`](https://github.com/burnt-labs/xion.js/commit/fa64a3f3811c4d175c272d526f93b88ad564c975) Thanks [@burnt-sun](https://github.com/burnt-sun)! - move url manipulation to strategies.

- Updated dependencies [[`82e2876`](https://github.com/burnt-labs/xion.js/commit/82e28763ca97805cc6d24b0402af2a2b28f56bf1), [`e88eca8`](https://github.com/burnt-labs/xion.js/commit/e88eca8d15714d9c0e266f9fccc009610e9f353c)]:
  - @burnt-labs/constants@0.1.0-alpha.18

## 1.0.0-alpha.58

### Minor Changes

- [#299](https://github.com/burnt-labs/xion.js/pull/299) [`b38363b`](https://github.com/burnt-labs/xion.js/commit/b38363b7f180e9240abf89ee4e64ca3475d07e7a) Thanks [@BurntVal](https://github.com/BurntVal)! - Add ibc transfer authorization logic to exported utils

## 1.0.0-alpha.57

### Minor Changes

- [#288](https://github.com/burnt-labs/xion.js/pull/288) [`c8d253c`](https://github.com/burnt-labs/xion.js/commit/c8d253cef6dd5e1ecfb7c1a217d5a4c3e67eb8ba) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix issue where we weren't accounting for values that decrement

- [#290](https://github.com/burnt-labs/xion.js/pull/290) [`0005d94`](https://github.com/burnt-labs/xion.js/commit/0005d94c254a64d712fa25e981364386c5c5dcd3) Thanks [@BurntVal](https://github.com/BurntVal)! - consolidate grant utility functions & improve grant decoding logic

## 1.0.0-alpha.56

### Patch Changes

- [#285](https://github.com/burnt-labs/xion.js/pull/285) [`0671c16`](https://github.com/burnt-labs/xion.js/commit/0671c1642fb2ab2241aeed4ce0daaecfd46c228a) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix mismatch between rest and rpc endpoint grant queries

## 1.0.0-alpha.55

### Minor Changes

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`5572077`](https://github.com/burnt-labs/xion.js/commit/557207735cece8a6050e9fb4aff4b398e3467cdb) Thanks [@burnt-sun](https://github.com/burnt-sun)! - Chore: apply prettier formatting.

### Patch Changes

- [#282](https://github.com/burnt-labs/xion.js/pull/282) [`3629b75`](https://github.com/burnt-labs/xion.js/commit/3629b750fa319205bab4c94d7252eda41484509f) Thanks [@BurntVal](https://github.com/BurntVal)! - Replace Buffer with toByteArray

- Updated dependencies [[`f2d6e5a`](https://github.com/burnt-labs/xion.js/commit/f2d6e5a8abf36d0bae7ffc85ad16552ad58ef5aa)]:
  - @burnt-labs/constants@0.1.0-alpha.17

## 1.0.0-alpha.54

### Minor Changes

- [#278](https://github.com/burnt-labs/xion.js/pull/278) [`86c23e3`](https://github.com/burnt-labs/xion.js/commit/86c23e33ad080fcb465453564e1df93762efb75f) Thanks [@BurntVal](https://github.com/BurntVal)! - introduces enhancements to the AbstraxionAuth class and its associated test suite. The changes aim to improve the functionality and reliability of the authentication process, particularly in handling and verifying grants.

### Patch Changes

- [#277](https://github.com/burnt-labs/xion.js/pull/277) [`cfd3e01`](https://github.com/burnt-labs/xion.js/commit/cfd3e01e1ee3b161184a415debb5b87888a65549) Thanks [@justinbarry](https://github.com/justinbarry)! - \* Upgrade @cosmjs packages from 0.32.4 to 0.33.1 to support Comet38.
  - Reduce calls to RPC status endpoint.

- [#275](https://github.com/burnt-labs/xion.js/pull/275) [`7228469`](https://github.com/burnt-labs/xion.js/commit/72284694eb61be083829488e8916e46e9836b4e6) Thanks [@justinbarry](https://github.com/justinbarry)! - Move customAccountFromAny function from deprecated @burnt-labs/signers package to abstraxion-core to remove the dependency.

## 1.0.0-alpha.53

### Major Changes

- [#270](https://github.com/burnt-labs/xion.js/pull/270) [`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659) Thanks [@BurntVal](https://github.com/BurntVal)! - implement strategy patterns for storage and redirect operations

### Patch Changes

- Updated dependencies [[`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659)]:
  - @burnt-labs/constants@0.1.0-alpha.16
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.52

### Patch Changes

- Updated dependencies [[`41aa337`](https://github.com/burnt-labs/xion.js/commit/41aa3376963d394eae5dbd3356b61ceb71fe8db4), [`5f8bd03`](https://github.com/burnt-labs/xion.js/commit/5f8bd033ce2845ea74dfbb8cb4380aa5745e19f1)]:
  - @burnt-labs/constants@0.1.0-alpha.15
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.51

### Minor Changes

- [#237](https://github.com/burnt-labs/xion.js/pull/237) [`cff2a3e`](https://github.com/burnt-labs/xion.js/commit/cff2a3e7eabdb1ab217ea7410ca30abfc81e8401) Thanks [@BurntVal](https://github.com/BurntVal)! - implement extended grant checks for legacy grant configs and treasury contracts

## 1.0.0-alpha.50

### Minor Changes

- [#243](https://github.com/burnt-labs/xion.js/pull/243) [`9fad9c4`](https://github.com/burnt-labs/xion.js/commit/9fad9c415c3131a9b7f4fbc837d299e7cb33fd0d) Thanks [@BurntVal](https://github.com/BurntVal)! - GranteeSignerClient simulate extension for fee granter param

- [#254](https://github.com/burnt-labs/xion.js/pull/254) [`ad2160d`](https://github.com/burnt-labs/xion.js/commit/ad2160d2b5c8192c7b838a477454f64be14ad79c) Thanks [@BurntVal](https://github.com/BurntVal)! - Remove keplr dependencies to resolve related bugs

## 1.0.0-alpha.49

### Minor Changes

- [#239](https://github.com/burnt-labs/xion.js/pull/239) [`6ca7dad`](https://github.com/burnt-labs/xion.js/commit/6ca7dad417a01b4a2594cdf4f935966cab62d442) Thanks [@BurntVal](https://github.com/BurntVal)! - simulation fix and granter override

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [[`5f5edf4`](https://github.com/burnt-labs/xion.js/commit/5f5edf4cf38546b9f726af9b685ea1ce39444551)]:
  - @burnt-labs/constants@0.1.0-alpha.14
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.47

### Minor Changes

- [#228](https://github.com/burnt-labs/xion.js/pull/228) [`bfdc30e`](https://github.com/burnt-labs/xion.js/commit/bfdc30e16b4028a561c7f1608f94fdec9faf8f83) Thanks [@BurntVal](https://github.com/BurntVal)! - Added a grant validity check to verify expiration

## 1.0.0-alpha.46

### Minor Changes

- [#218](https://github.com/burnt-labs/xion.js/pull/218) [`1e3bd4e`](https://github.com/burnt-labs/xion.js/commit/1e3bd4eb46d730f6a7e7dd31fa1728c78bac1d97) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce treasury contract parameter. Look into the Abstraxion/README or the demo-app/layout for more information

### Patch Changes

- Updated dependencies [[`147c8db`](https://github.com/burnt-labs/xion.js/commit/147c8dbe36b030edd4d97edcbb1a0f1674103011)]:
  - @burnt-labs/constants@0.1.0-alpha.13
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.45

### Minor Changes

- [#219](https://github.com/burnt-labs/xion.js/pull/219) [`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade cosmjs dependencies to fix raw log parsing error

### Patch Changes

- Updated dependencies [[`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7), [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069)]:
  - @burnt-labs/signers@0.1.0-alpha.13
  - @burnt-labs/constants@0.1.0-alpha.12

## 1.0.0-alpha.44

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

- [#150](https://github.com/burnt-labs/xion.js/pull/150) [`2df184a`](https://github.com/burnt-labs/xion.js/commit/2df184a661f74f6a9a412336f7df271d9f6f4b9c) Thanks [@justinbarry](https://github.com/justinbarry)! - Add a return type to SignArbSecp256k1HdWallet's `getAccounts` method

- Updated dependencies [[`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a), [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267), [`78cf088`](https://github.com/burnt-labs/xion.js/commit/78cf0886ccc1a4c023642c4a7d87f9196d637940)]:
  - @burnt-labs/constants@0.1.0-alpha.11
  - @burnt-labs/signers@0.1.0-alpha.12

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [[`e9dd176`](https://github.com/burnt-labs/xion.js/commit/e9dd1766dbfe4994948e028b51c07eb6dd52cced)]:
  - @burnt-labs/constants@0.1.0-alpha.10

## 1.0.0-alpha.42

### Minor Changes

- [#190](https://github.com/burnt-labs/xion.js/pull/190) [`bcc35c9`](https://github.com/burnt-labs/xion.js/commit/bcc35c9ed8faf2edb6f1e19f06e8b8ced9530067) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce configurable redirect url param

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

### Patch Changes

- Updated dependencies [[`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060), [`a0b5031`](https://github.com/burnt-labs/xion.js/commit/a0b5031f8766369b00562387b692450f396a9d7f)]:
  - @burnt-labs/constants@0.1.0-alpha.9
  - @burnt-labs/signers@0.1.0-alpha.11

## 1.0.0-alpha.41

### Minor Changes

- [#174](https://github.com/burnt-labs/xion.js/pull/174) [`b3ecf24`](https://github.com/burnt-labs/xion.js/commit/b3ecf24cf8c240c2b0c721ed803decca9f6a91a4) Thanks [@BurntVal](https://github.com/BurntVal)! - Refactor abstraxion to implement core; clean up and fix AbstraxionAuth class; impl unit tests for AbstraxionAuth

## 1.0.0-alpha.40

### Minor Changes

- [#162](https://github.com/burnt-labs/xion.js/pull/162) [`f018dc1`](https://github.com/burnt-labs/xion.js/commit/f018dc124615bbf467abbea35cb656852233593d) Thanks [@BurntVal](https://github.com/BurntVal)! - Improve polling mechanism

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [[`bed091d`](https://github.com/burnt-labs/xion.js/commit/bed091d74557457efb681734a27b46d97cdefbbe)]:
  - @burnt-labs/signers@0.1.0-alpha.10

## 1.0.0-alpha.38

### Minor Changes

- [#139](https://github.com/burnt-labs/xion.js/pull/139) [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582) Thanks [@BurntVal](https://github.com/BurntVal)! - Extend abstraxion-core to allow for framework agnostic implementations

### Patch Changes

- Updated dependencies [[`958f66a`](https://github.com/burnt-labs/xion.js/commit/958f66ab7b82bdbb8a591d16b2cc399859e8508b), [`4c230d8`](https://github.com/burnt-labs/xion.js/commit/4c230d82f20b934acd77ea102e45a29ad3e148ae), [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582), [`8ec1c5b`](https://github.com/burnt-labs/xion.js/commit/8ec1c5b752f8136c9e6ba7fcfec16e85542d7c21)]:
  - @burnt-labs/constants@0.1.0-alpha.8

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [[`8de24aa`](https://github.com/burnt-labs/xion.js/commit/8de24aa187e9316c9cf9a1f431f08e4ae629842e), [`12b995f`](https://github.com/burnt-labs/xion.js/commit/12b995f5c3216bad7537d4232ea2bbd2340ced32)]:
  - @burnt-labs/constants@0.1.0-alpha.7

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [[`6978612`](https://github.com/burnt-labs/xion.js/commit/697861259eff1199d143f79c7d8c0666eec4760b)]:
  - @burnt-labs/signers@0.1.0-alpha.9

## 1.0.0-alpha.35

### Minor Changes

- [#118](https://github.com/burnt-labs/xion.js/pull/118) [`fafb2af`](https://github.com/burnt-labs/xion.js/commit/fafb2af44b647dcfce3bccd9b91b6d0ffefc4ed0) Thanks [@justinbarry](https://github.com/justinbarry)! - Add `getGranteeAccountData` method to the GranteeSignerClient class

## 1.0.0-alpha.34

### Minor Changes

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Impl Ethereum authenticator and signer

- [#103](https://github.com/burnt-labs/xion.js/pull/103) [`ace50e5`](https://github.com/burnt-labs/xion.js/commit/ace50e507e5d33b75092e3c4823ba0c5c6ad04d2) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Added sign arb demo to demo app and made granteeAddress readable in GranteeSignerClient.

### Patch Changes

- Updated dependencies [[`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77)]:
  - @burnt-labs/signers@0.1.0-alpha.8

## 1.0.0-alpha.33

### Patch Changes

- Updated dependencies [[`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4)]:
  - @burnt-labs/signers@0.1.0-alpha.7

## 1.0.0-alpha.32

### Minor Changes

- [#94](https://github.com/burnt-labs/xion.js/pull/94) [`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update the following packages to the latest version:

  | Package                   | Version |
  | ------------------------- | ------- |
  | @cosmjs/cosmwasm-stargate | ^0.32.2 |
  | @cosmjs/proto-signing     | ^0.32.2 |
  | @cosmjs/stargate          | ^0.32.2 |
  | @cosmjs/tendermint-rpc    | ^0.32.2 |
  | cosmjs-types              | ^0.9.0  |

### Patch Changes

- Updated dependencies [[`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e)]:
  - @burnt-labs/signers@0.1.0-alpha.6

## 1.0.0-alpha.31

### Patch Changes

- Updated dependencies [[`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8)]:
  - @burnt-labs/constants@0.1.0-alpha.6

## 1.0.0-alpha.30

### Minor Changes

- [#92](https://github.com/burnt-labs/xion.js/pull/92) [`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa) Thanks [@Peartes](https://github.com/Peartes)! - Pull GranteeSignerClient into a separate "core" package to help others reproduce abstraxion functionality
