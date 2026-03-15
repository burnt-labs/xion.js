# @burnt-labs/constants

## 0.1.0-alpha.23

### Patch Changes

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

## 0.1.0-alpha.22

### Patch Changes

- [#342](https://github.com/burnt-labs/xion.js/pull/342) [`847ad14`](https://github.com/burnt-labs/xion.js/commit/847ad14b0d6c75f9f3272723176638ac246c4597) Thanks [@justinbarry](https://github.com/justinbarry)! - Add missing repository field to package.json to fix npm publish provenance verification

## 0.1.0-alpha.21

### Patch Changes

- [#335](https://github.com/burnt-labs/xion.js/pull/335) [`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114) Thanks [@ertemann](https://github.com/ertemann)! - Consolidate some more code, add cache for treasury to better serve dashboard

## 0.1.0-alpha.20

### Minor Changes

- [#314](https://github.com/burnt-labs/xion.js/pull/314) [`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9) Thanks [@ertemann](https://github.com/ertemann)! - This release introduces **Signer Mode**, allowing users to connect with external wallets (MetaMask, Keplr, OKX, Turnkey, etc.) without requiring dashboard redirects. We've also refactored Abstraxion with a new connector-based architecture for better flexibility and extensibility. The release includes automatic configuration defaults (rpcUrl, restUrl, gasPrice are now inferred from chainId), migration to AA API V2, and two new packages: `@burnt-labs/account-management` and `@burnt-labs/signers`. Indexer support has been added for fast account discovery using Numia, Subquery, and DaoDao indexers. The Direct Signer Mode has been removed in favor of the new Signer Mode. Existing redirect mode users require no changes, while signer mode users need to add an `authentication` config with `type: "signer"`, `aaApiUrl`, `getSignerConfig()`, and `smartAccountContract` settings.

## 0.1.0-alpha.19

### Minor Changes

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

## 0.1.0-alpha.18

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

## 0.1.0-alpha.17

### Patch Changes

- [#280](https://github.com/burnt-labs/xion.js/pull/280) [`f2d6e5a`](https://github.com/burnt-labs/xion.js/commit/f2d6e5a8abf36d0bae7ffc85ad16552ad58ef5aa) Thanks [@BurntVal](https://github.com/BurntVal)! - Default to testnet-2

## 0.1.0-alpha.16

### Minor Changes

- [#270](https://github.com/burnt-labs/xion.js/pull/270) [`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659) Thanks [@BurntVal](https://github.com/BurntVal)! - implement strategy patterns for storage and redirect operations

## 0.1.0-alpha.15

### Minor Changes

- [#258](https://github.com/burnt-labs/xion.js/pull/258) [`5f8bd03`](https://github.com/burnt-labs/xion.js/commit/5f8bd033ce2845ea74dfbb8cb4380aa5745e19f1) Thanks [@BurntVal](https://github.com/BurntVal)! - Add a key for testnet-2

### Patch Changes

- [#271](https://github.com/burnt-labs/xion.js/pull/271) [`41aa337`](https://github.com/burnt-labs/xion.js/commit/41aa3376963d394eae5dbd3356b61ceb71fe8db4) Thanks [@justinbarry](https://github.com/justinbarry)! - Update testnet-2 dashboard URL

## 0.1.0-alpha.14

### Minor Changes

- [#240](https://github.com/burnt-labs/xion.js/pull/240) [`5f5edf4`](https://github.com/burnt-labs/xion.js/commit/5f5edf4cf38546b9f726af9b685ea1ce39444551) Thanks [@justinbarry](https://github.com/justinbarry)! - Update default gas price to 0.001uxion

## 0.1.0-alpha.13

### Patch Changes

- [#226](https://github.com/burnt-labs/xion.js/pull/226) [`147c8db`](https://github.com/burnt-labs/xion.js/commit/147c8dbe36b030edd4d97edcbb1a0f1674103011) Thanks [@2xburnt](https://github.com/2xburnt)! - Update index.ts to use our rpc domain

## 0.1.0-alpha.12

### Minor Changes

- [#216](https://github.com/burnt-labs/xion.js/pull/216) [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix under simulation

## 0.1.0-alpha.11

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

## 0.1.0-alpha.10

### Minor Changes

- [#198](https://github.com/burnt-labs/xion.js/pull/198) [`e9dd176`](https://github.com/burnt-labs/xion.js/commit/e9dd1766dbfe4994948e028b51c07eb6dd52cced) Thanks [@BurntVal](https://github.com/BurntVal)! - Update chainInfo vars across monorepo. Please view the abstraxion package readme for more info on opting into mainnet

## 0.1.0-alpha.9

### Minor Changes

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

## 0.1.0-alpha.8

### Minor Changes

- [#151](https://github.com/burnt-labs/xion.js/pull/151) [`958f66a`](https://github.com/burnt-labs/xion.js/commit/958f66ab7b82bdbb8a591d16b2cc399859e8508b) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Broke out grant flow to unique app.

- [#134](https://github.com/burnt-labs/xion.js/pull/134) [`4c230d8`](https://github.com/burnt-labs/xion.js/commit/4c230d82f20b934acd77ea102e45a29ad3e148ae) Thanks [@BurntVal](https://github.com/BurntVal)! - Add Authenticator Modal & Fresh User Dashboard Flow

- [#139](https://github.com/burnt-labs/xion.js/pull/139) [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582) Thanks [@BurntVal](https://github.com/BurntVal)! - Extend abstraxion-core to allow for framework agnostic implementations

- [#141](https://github.com/burnt-labs/xion.js/pull/141) [`8ec1c5b`](https://github.com/burnt-labs/xion.js/commit/8ec1c5b752f8136c9e6ba7fcfec16e85542d7c21) Thanks [@justinbarry](https://github.com/justinbarry)! - Transition from dashboard.burnt.com to settings.burnt.com to help us ready for splitting the dashboard apart

## 0.1.0-alpha.7

### Minor Changes

- [#121](https://github.com/burnt-labs/xion.js/pull/121) [`12b995f`](https://github.com/burnt-labs/xion.js/commit/12b995f5c3216bad7537d4232ea2bbd2340ced32) Thanks [@BurntVal](https://github.com/BurntVal)! - Refactor Abstraxion to fetch config

### Patch Changes

- [#137](https://github.com/burnt-labs/xion.js/pull/137) [`8de24aa`](https://github.com/burnt-labs/xion.js/commit/8de24aa187e9316c9cf9a1f431f08e4ae629842e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update casing of "XION" from across multiple components

## 0.1.0-alpha.6

### Minor Changes

- [#97](https://github.com/burnt-labs/xion.js/pull/97) [`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8) Thanks [@justinbarry](https://github.com/justinbarry)! - Update default RPC/Rest Urls and allow for dapps to pass in rest url via the AbstraxionProvider.

  ```typescript
          <AbstraxionProvider
            config={{
              restUrl: "https://api.example.com",
            }}
          >
            {children}
          </AbstraxionProvider>

  ```

## 0.1.0-alpha.5

### Minor Changes

- [#89](https://github.com/burnt-labs/xion.js/pull/89) [`874ef2b`](https://github.com/burnt-labs/xion.js/commit/874ef2b6e0096285beff6752c7e2dc1e1c276ba4) Thanks [@justinbarry](https://github.com/justinbarry)! - Return RPC to rpc.xion-testnet-1.burnt.com:443 to avoid proxy rate limiting

## 0.1.0-alpha.4

### Minor Changes

- [#85](https://github.com/burnt-labs/xion.js/pull/85) [`e60fb47`](https://github.com/burnt-labs/xion.js/commit/e60fb4714b8cdf90ad2cfbba5c77b8b78a11542b) Thanks [@justinbarry](https://github.com/justinbarry)! - Update to use a round robin rpc endpoint

## 0.0.1-alpha.3

### Patch Changes

- [#67](https://github.com/burnt-labs/xion.js/pull/67) [`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove exports from package.json in signers and constants package. Additionally, adjust build setting to output more predicable build output.

## 0.0.1-alpha.2

### Patch Changes

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix package.json `main` path

## 0.0.1-alpha.1

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - Release constants as a npm package

## 0.0.1-alpha.0

### Patch Changes

- Initial Release
