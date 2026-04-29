# @burnt-labs/signers

## 1.0.0-alpha.8

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
  - @burnt-labs/constants@0.1.0-alpha.24

## 1.0.0-alpha.7

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
  - @burnt-labs/constants@0.1.0-alpha.23

## 1.0.0-alpha.6

### Patch Changes

- Updated dependencies [[`847ad14`](https://github.com/burnt-labs/xion.js/commit/847ad14b0d6c75f9f3272723176638ac246c4597)]:
  - @burnt-labs/constants@0.1.0-alpha.22

## 1.0.0-alpha.5

### Patch Changes

- [#335](https://github.com/burnt-labs/xion.js/pull/335) [`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114) Thanks [@ertemann](https://github.com/ertemann)! - Consolidate some more code, add cache for treasury to better serve dashboard

- [#341](https://github.com/burnt-labs/xion.js/pull/341) [`70481a8`](https://github.com/burnt-labs/xion.js/commit/70481a85beba828767f71f6b7eb1374e2ceee0bc) Thanks [@Kushal7788](https://github.com/Kushal7788)! - Added zk-email signer and it's types

- Updated dependencies [[`6bf65b7`](https://github.com/burnt-labs/xion.js/commit/6bf65b758e6c6064d591e6ff694431b497b3e114)]:
  - @burnt-labs/constants@0.1.0-alpha.21

## 1.0.0-alpha.4

### Patch Changes

- [#332](https://github.com/burnt-labs/xion.js/pull/332) [`4b572f0`](https://github.com/burnt-labs/xion.js/commit/4b572f0937ce567ea40868b6b63987d933f6ca9a) Thanks [@ertemann](https://github.com/ertemann)! - Additions and cleanup from dashboard migration

## 1.0.0-alpha.3

### Minor Changes

- [#326](https://github.com/burnt-labs/xion.js/pull/326) [`45e3a7b`](https://github.com/burnt-labs/xion.js/commit/45e3a7b6cb83b5fb812a382e09073285f32303d5) Thanks [@ertemann](https://github.com/ertemann)! - expose extra type and add ADR wrap to secpk1 verifcation so to allow signers like keplr/okx

## 1.0.0-alpha.2

### Minor Changes

- [#314](https://github.com/burnt-labs/xion.js/pull/314) [`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9) Thanks [@ertemann](https://github.com/ertemann)! - This release introduces **Signer Mode**, allowing users to connect with external wallets (MetaMask, Keplr, OKX, Turnkey, etc.) without requiring dashboard redirects. We've also refactored Abstraxion with a new connector-based architecture for better flexibility and extensibility. The release includes automatic configuration defaults (rpcUrl, restUrl, gasPrice are now inferred from chainId), migration to AA API V2, and two new packages: `@burnt-labs/account-management` and `@burnt-labs/signers`. Indexer support has been added for fast account discovery using Numia, Subquery, and DaoDao indexers. The Direct Signer Mode has been removed in favor of the new Signer Mode. Existing redirect mode users require no changes, while signer mode users need to add an `authentication` config with `type: "signer"`, `aaApiUrl`, `getSignerConfig()`, and `smartAccountContract` settings.

### Patch Changes

- Updated dependencies [[`f7359df`](https://github.com/burnt-labs/xion.js/commit/f7359dfdb0d3de55f51b7d8abcfa2e3c7baeb8e9)]:
  - @burnt-labs/constants@0.1.0-alpha.20

## 0.1.0-alpha.14

### Minor Changes

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`d390f1e`](https://github.com/burnt-labs/xion.js/commit/d390f1e4df207cde79056b7919965b0f2e473f3d) Thanks [@burnt-sun](https://github.com/burnt-sun)! - chore: apply prettier formatting

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`5572077`](https://github.com/burnt-labs/xion.js/commit/557207735cece8a6050e9fb4aff4b398e3467cdb) Thanks [@burnt-sun](https://github.com/burnt-sun)! - Chore: apply prettier formatting.

> ⚠️ **DEPRECATED**: This package is deprecated as of [CURRENT DATE] and will no longer receive updates or maintenance.

## 0.1.0-alpha.14

### Major Changes

- Package deprecated. This package will no longer receive updates or maintenance. Please contact the Burnt Labs team for migration guidance and alternative solutions.

## 0.1.0-alpha.13

### Minor Changes

- [#219](https://github.com/burnt-labs/xion.js/pull/219) [`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade cosmjs dependencies to fix raw log parsing error

- [#216](https://github.com/burnt-labs/xion.js/pull/216) [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix under simulation

## 0.1.0-alpha.12

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

- [#214](https://github.com/burnt-labs/xion.js/pull/214) [`78cf088`](https://github.com/burnt-labs/xion.js/commit/78cf0886ccc1a4c023642c4a7d87f9196d637940) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix gas calculation param bug

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

## 0.1.0-alpha.11

### Minor Changes

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

- [#178](https://github.com/burnt-labs/xion.js/pull/178) [`a0b5031`](https://github.com/burnt-labs/xion.js/commit/a0b5031f8766369b00562387b692450f396a9d7f) Thanks [@BurntVal](https://github.com/BurntVal)! - Implement ability to remove authenticators

## 0.1.0-alpha.10

### Minor Changes

- [#147](https://github.com/burnt-labs/xion.js/pull/147) [`bed091d`](https://github.com/burnt-labs/xion.js/commit/bed091d74557457efb681734a27b46d97cdefbbe) Thanks [@BurntVal](https://github.com/BurntVal)! - Implementation of OKX wallet (cosmos provider)

## 0.1.0-alpha.9

### Patch Changes

- [#117](https://github.com/burnt-labs/xion.js/pull/117) [`6978612`](https://github.com/burnt-labs/xion.js/commit/697861259eff1199d143f79c7d8c0666eec4760b) Thanks [@BurntVal](https://github.com/BurntVal)! - Add configurability to allow for mainnet/testnet deployments

  For devs utilizing the `buildAddJWTAuthenticatorMsg` found in the @burnt-labs/signers package, please note that you will now need to pass in an aud string. Contact the team for details.

## 0.1.0-alpha.8

### Minor Changes

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Impl Ethereum authenticator and signer

## 0.1.0-alpha.7

### Minor Changes

- [#78](https://github.com/burnt-labs/xion.js/pull/78) [`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4) Thanks [@BurntVal](https://github.com/BurntVal)! - introduce the ability to add a secp256k1 authenticator (via Keplr) and use it as a signer for transactions

## 0.1.0-alpha.6

### Minor Changes

- [#94](https://github.com/burnt-labs/xion.js/pull/94) [`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update the following packages to the latest version:

  | Package                   | Version |
  | ------------------------- | ------- |
  | @cosmjs/cosmwasm-stargate | ^0.32.2 |
  | @cosmjs/proto-signing     | ^0.32.2 |
  | @cosmjs/stargate          | ^0.32.2 |
  | @cosmjs/tendermint-rpc    | ^0.32.2 |
  | cosmjs-types              | ^0.9.0  |

## 0.1.0-alpha.5

### Patch Changes

- [#67](https://github.com/burnt-labs/xion.js/pull/67) [`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove exports from package.json in signers and constants package. Additionally, adjust build setting to output more predicable build output.

## 0.1.0-alpha.4

### Minor Changes

- [#53](https://github.com/burnt-labs/xion.js/pull/53) [`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952) Thanks [@justinbarry](https://github.com/justinbarry)! - Add getAccount method in GranteeSignerClient to parse abstractaccount.v1.AbstractAccount type accounts

## 0.1.0-alpha.3

### Minor Changes

- [#37](https://github.com/burnt-labs/xion.js/pull/37) [`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8) Thanks [@justinbarry](https://github.com/justinbarry)! - Change API endpoints to the 'live' infrastructure and the live stytch project id

## 0.0.1-alpha.2

### Patch Changes

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix package.json `main` path

## 0.0.1-alpha.1

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - 1include both CommonJS and ESM formats in the release setup. Additionally, minification was disabled for these packages.

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade typescript dependency

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - The eslint config file extend property was changed to point to "@burnt-labs/eslint-config-custom/next" or "@burnt-labs/eslint-config-custom/react" appropriately and `root` property was set to true.

## 0.0.1-alpha.0

### Patch Changes

- Initial Release
