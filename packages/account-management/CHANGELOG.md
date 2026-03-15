# @burnt-labs/account-management

## 1.0.0-alpha.9

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

- Updated dependencies [[`1a387ca`](https://github.com/burnt-labs/xion.js/commit/1a387cabe46a20c6a88fc32e51c8f88f99ccddf1)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.68
  - @burnt-labs/signers@1.0.0-alpha.7

## 1.0.0-alpha.8

### Patch Changes

- [#348](https://github.com/burnt-labs/xion.js/pull/348) [`00ac279`](https://github.com/burnt-labs/xion.js/commit/00ac279a15f1845f62d63507ceb02ec70e5c5dc1) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix treasury queries failing for contracts with no grant configs. `DirectQueryTreasuryStrategy` now returns empty `grantConfigs` instead of throwing "Treasury config not found".

## 1.0.0-alpha.7

### Patch Changes

- Updated dependencies []:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.67
  - @burnt-labs/signers@1.0.0-alpha.6

## 1.0.0-alpha.6

### Patch Changes

- [#335](https://github.com/burnt-labs/xion.js/pull/335) [`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114) Thanks [@ertemann](https://github.com/ertemann)! - Consolidate some more code, add cache for treasury to better serve dashboard

- Updated dependencies [[`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114), [`70481a8`](https://github.com/burnt-labs/xion.js/commit/70481a85beba828767f71f6b7eb1374e2ceee0bc)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.66
  - @burnt-labs/signers@1.0.0-alpha.5

## 1.0.0-alpha.5

### Patch Changes

- Updated dependencies [[`00fb815`](https://github.com/burnt-labs/xion.js/commit/00fb815df96b5707714dfd4bfe9f39d636c8b5b1)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.65

## 1.0.0-alpha.4

### Patch Changes

- [#332](https://github.com/burnt-labs/xion.js/pull/332) [`4b572f0`](https://github.com/burnt-labs/xion.js/commit/4b572f0937ce567ea40868b6b63987d933f6ca9a) Thanks [@ertemann](https://github.com/ertemann)! - Additions and cleanup from dashboard migration

- Updated dependencies [[`4b572f0`](https://github.com/burnt-labs/xion.js/commit/4b572f0937ce567ea40868b6b63987d933f6ca9a)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.64
  - @burnt-labs/signers@1.0.0-alpha.4

## 1.0.0-alpha.3

### Minor Changes

- [#326](https://github.com/burnt-labs/xion.js/pull/326) [`45e3a7b`](https://github.com/burnt-labs/xion.js/commit/45e3a7b6cb83b5fb812a382e09073285f32303d5) Thanks [@ertemann](https://github.com/ertemann)! - expose extra type and add ADR wrap to secpk1 verifcation so to allow signers like keplr/okx

### Patch Changes

- Updated dependencies [[`45e3a7b`](https://github.com/burnt-labs/xion.js/commit/45e3a7b6cb83b5fb812a382e09073285f32303d5)]:
  - @burnt-labs/signers@1.0.0-alpha.3
  - @burnt-labs/abstraxion-core@1.0.0-alpha.63

## 1.0.0-alpha.2

### Minor Changes

- [#314](https://github.com/burnt-labs/xion.js/pull/314) [`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9) Thanks [@ertemann](https://github.com/ertemann)! - This release introduces **Signer Mode**, allowing users to connect with external wallets (MetaMask, Keplr, OKX, Turnkey, etc.) without requiring dashboard redirects. We've also refactored Abstraxion with a new connector-based architecture for better flexibility and extensibility. The release includes automatic configuration defaults (rpcUrl, restUrl, gasPrice are now inferred from chainId), migration to AA API V2, and two new packages: `@burnt-labs/account-management` and `@burnt-labs/signers`. Indexer support has been added for fast account discovery using Numia, Subquery, and DaoDao indexers. The Direct Signer Mode has been removed in favor of the new Signer Mode. Existing redirect mode users require no changes, while signer mode users need to add an `authentication` config with `type: "signer"`, `aaApiUrl`, `getSignerConfig()`, and `smartAccountContract` settings.

### Patch Changes

- Updated dependencies [[`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.62
  - @burnt-labs/signers@1.0.0-alpha.2
