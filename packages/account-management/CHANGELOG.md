# @burnt-labs/account-management

## 1.0.0-alpha.16

### Minor Changes

- [#409](https://github.com/burnt-labs/xion.js/pull/409) [`ad5dbeb`](https://github.com/burnt-labs/xion.js/commit/ad5dbeb9d039c731e155c402c7f74c4fc4a05b3c) Thanks [@2xburnt](https://github.com/2xburnt)! - Account discovery can use the DaoDao indexer instead of Numia, which is being retired:

  ```ts
  indexer: {
    type: "daodao",
    url: getDaoDaoIndexerUrl(chainId), // "https://daodaoindexer.burnt.com"
    chainId,
  }
  ```

  - `@burnt-labs/account-management`: new `DaoDaoAccountStrategy` (`new DaoDaoAccountStrategy(url, chainId, timeoutMs?)`), selected by `type: "daodao"` in `createCompositeAccountStrategy` and `convertIndexerConfig`. It calls `GET {url}/{chainId}/generic/_/xion/accountsByAuthenticator?type=…&authenticator=…` and returns every account the indexer tracks that currently holds the authenticator, each with its authenticators and their on-chain indices. On `xion-testnet-2` the indexer does not track `abstract:account` contracts (code ID 1986) or contracts recorded with code ID 0, so a lookup for one of those comes back empty, like a miss. Authenticators of a type the SDK has no signer for (e.g. `Secp256R1`) are left out of that list, so it is not a complete view of an account's authenticators. An EthWallet address is sent lowercase with `0x` (`normalizeEthereumAddress`, as the AA API lookup does), a Secp256K1 key through `normalizeSecp256k1PublicKey` (also as the AA API lookup does), a hex Ed25519 key as base64, and a full JWT as its `aud.sub` identity: the forms the indexer stores. A miss is an empty list; a `200` body that is not a list, or an entry without a canonical `xion1…` contract (32-byte) address, a positive code ID and authenticators of an indexed type with a non-empty identity at distinct indices, throws, as does an account that does not hold the queried authenticator (exact identity; EthWallet compared case-insensitively, Secp256K1 by key bytes). Any other status, including `404` while the indexer has not deployed the lookup, throws so the composite falls through to the next strategy. A request is aborted after 30 seconds (`timeout` in the config, in milliseconds, or the third constructor argument) so a stalled indexer also falls through. With DaoDao configured, `createCompositeAccountStrategy` does not add the empty fallback: if DaoDao fails and no other configured source succeeds, discovery throws (`checkAccountExists` returns `error`, and `connectAccount` refuses to create an account) rather than reporting "no account". Subquery and Numia keep the empty fallback. No token is needed. `DaoDaoIndexerConfig` and `NumiaIndexerConfig` are exported.
  - `checkAccountExists`: for JWT, Passkey, Ed25519 and other non-verified types, the authenticator index now comes from the login's own authenticator where one exists: same type before other types, exact identity before one differing only by case, Ed25519 keys matched by bytes (hex or base64), and a full JWT login matched by its `aud.sub` identity.
  - **Deprecated:** `NumiaAccountStrategy` and the `type: "numia"` indexer config (also the default when `type` is omitted). They keep working for now and will be removed in a later release; move to `type: "daodao"`.
  - `@burnt-labs/abstraxion-js`: `IndexerConfig` accepts the DaoDao variant. Signer mode with `smartAccountContract` still ignores `indexer` (the AA API is the only discovery source there), so signer-mode apps can drop a Numia indexer block without replacing it.

## 1.0.0-alpha.15

### Major Changes

- [#406](https://github.com/burnt-labs/xion.js/pull/406) [`30e9d00`](https://github.com/burnt-labs/xion.js/commit/30e9d00782b99850505e5bb437fb7f59ed8a15b6) Thanks [@2xburnt](https://github.com/2xburnt)! - Smart-account addresses now come from the AA API. Signer mode no longer derives addresses in the SDK and no longer needs a contract checksum:

  ```ts
  authentication: {
    type: "signer",
    aaApiUrl,
    getSignerConfig,
    smartAccountContract: { codeId, addressPrefix: "xion" },
  }
  ```

  - `@burnt-labs/abstraxion-core`: `createEthWalletAccount` / `createSecp256k1Account` gain an options overload `{ addressSource: "aa-api", addressPrefix, rpcUrl? }`. Creation calls `GET /api/v2/account/address/{type}/{id}`, signs exactly the returned address and posts the existing create request; a failed, timed-out (10 s) or malformed lookup stops before signing, and a create response for another address is rejected. The positional seven-argument overloads still compile; their `checksum` argument is ignored. New exports: `resolveAAApiAccountAddress`, `findAAApiAccountAddress`, `normalizeAAApiIdentifier`, `AAApiAccountCreationOptions`, `AAApiAccountNotFoundError` (thrown by `checkAccountOnChain` only on HTTP 404). `getAccountAddress` / `checkAccountOnChain` accept an optional `{ signal }`.
  - `@burnt-labs/account-management`: `AAApiAccountStrategy` is exported and implements `version: "v2"` (`{ baseURL, version: "v2", rpcUrl, addressPrefix }`): `GET /api/v2/account/check/{type}/{id}`, then on-chain verification of the reported contract, its actual code ID and a matching authenticator. Only an HTTP 404 means "no account"; every other failure is a discovery error. `createCompositeAccountStrategy` with `aaApi.version: "v2"` contains only that strategy (no indexer, RPC or empty fallback). `checkAccountExists` matches EthWallet/Secp256K1 authenticators by type and normalized identifier and reports a missing match as an error instead of defaulting to index 0. `connectAccount` uses the aa-api creation overload. `SmartAccountContractConfig.checksum` is optional and ignored.
  - **Breaking (alpha line):** `RpcAccountStrategy` is now a deprecated adapter over `AAApiAccountStrategy` v2. It throws a migration error unless `aaApiUrl` is passed; `checksum`, `creator` and `codeId` are accepted but ignored. It now supports EthWallet and Secp256K1 only: JWT and Passkey lookups, which the checksum-based version handled, reject (use `AAApiAccountStrategy` v1 or an indexer strategy for JWT). Signer-config users already pass `aaApiUrl` and need no change.
  - `@burnt-labs/abstraxion-js`: signer mode discovers accounts only through the AA API v2 strategy and creates them with the aa-api address source; `signer.indexer` is no longer used for signer-mode discovery. `createAccountCreationConfigFromConfig` returns a config without a checksum.
  - `@burnt-labs/signers`: `normalizeSecp256k1PublicKey` accepts its own output for uncompressed keys (88-char base64 of a 65-byte `0x04…` key), so normalizing twice no longer throws.
  - `@burnt-labs/abstraxion-react-native`: re-exports the signer config type, so `smartAccountContract.checksum` is optional in its published declarations too.

  There is no legacy-checksum fallback. Accounts the AA API returns through its ordinary lookup are found regardless of age, and mainnet pre-v31 addresses are unchanged. A few historical testnet accounts created under an older checksum have no dedicated recovery path.

### Patch Changes

- Updated dependencies [[`30e9d00`](https://github.com/burnt-labs/xion.js/commit/30e9d00782b99850505e5bb437fb7f59ed8a15b6), [`30e9d00`](https://github.com/burnt-labs/xion.js/commit/30e9d00782b99850505e5bb437fb7f59ed8a15b6)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.74
  - @burnt-labs/signers@1.0.0-alpha.12

## 1.0.0-alpha.14

### Patch Changes

- [#385](https://github.com/burnt-labs/xion.js/pull/385) [`d17c427`](https://github.com/burnt-labs/xion.js/commit/d17c4277596cac0edbcfdfbfc881443b47c1be0b) Thanks [@justinbarry](https://github.com/justinbarry)! - `urlsMatch` now compares the full URL origin (protocol + host + port) instead of only protocol + host. URLs that differ only by port (e.g. `https://example.com:443` vs `https://example.com:8443`) are no longer treated as matching, and unparseable inputs compare as non-matching. Schemes without a tuple origin (`data:`, `file:`, `mailto:`, …) stringify their origin as the literal `"null"` and are now rejected too, so two opaque-origin URLs no longer match each other.

- [#386](https://github.com/burnt-labs/xion.js/pull/386) [`1e4b0e7`](https://github.com/burnt-labs/xion.js/commit/1e4b0e7edc8232a956ad98dcf47a52f97ee4d273) Thanks [@ertemann](https://github.com/ertemann)! - Update @burnt-labs/xion-types to 30.0.0-rc1 to match the v30.0.0 xion chain release

- Updated dependencies [[`8014042`](https://github.com/burnt-labs/xion.js/commit/80140420ad70e3ec35711d7f361412ac27308f39), [`1e4b0e7`](https://github.com/burnt-labs/xion.js/commit/1e4b0e7edc8232a956ad98dcf47a52f97ee4d273)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.73
  - @burnt-labs/signers@1.0.0-alpha.11

## 1.0.0-alpha.13

### Minor Changes

- [#383](https://github.com/burnt-labs/xion.js/pull/383) [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c) Thanks [@ertemann](https://github.com/ertemann)! - feat(account-management): add `getMsgTypeUrlForRevoke(authorizationTypeUrl, stakeAuthType?)` pure helper in `grants/` (exported from `@burnt-labs/account-management`). Maps an authz authorization `@type` to the `MsgRevoke`-able msg type URL, including the `StakeAuthorization` delegate/undelegate/redelegate variants (keyed by enum name or numeric proto value). Lets dashboard/xion-app consumers drop their local copies.

### Patch Changes

- [#383](https://github.com/burnt-labs/xion.js/pull/383) [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c) Thanks [@ertemann](https://github.com/ertemann)! - fix(account-management): reject the DaoDao indexer's unindexed-treasury placeholder. The indexer returns `{ admin: null, grantConfigs: {}, … }` (not a 404) for any contract it hasn't indexed; `DaoDaoTreasuryStrategy.validateAllResponse` now rejects when `admin` is null/absent instead of accepting it as a successful empty config. In a racing `CompositeTreasuryStrategy` this lets `DirectQueryTreasuryStrategy` win, so an un-indexed treasury no longer silently degrades the connect screen to "Read access only".

- Updated dependencies [[`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c), [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c)]:
  - @burnt-labs/signers@1.0.0-alpha.10
  - @burnt-labs/abstraxion-core@1.0.0-alpha.72

## 1.0.0-alpha.12

### Major Changes

- [#373](https://github.com/burnt-labs/xion.js/pull/373) [`868bb10`](https://github.com/burnt-labs/xion.js/commit/868bb106962b709555c94bf53c5318367a6b7439) Thanks [@ertemann](https://github.com/ertemann)! - feat(account-management): fail-fast guards for `CompositeAccountStrategy` and `accountConnection` — surface configuration/strategy errors immediately instead of silently degrading, fixing latent strategy bugs uncovered while migrating the integration tests to `@burnt-labs/abstraxion-js`.

### Patch Changes

- Updated dependencies [[`868bb10`](https://github.com/burnt-labs/xion.js/commit/868bb106962b709555c94bf53c5318367a6b7439)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.71

## 1.0.0-alpha.11

### Patch Changes

- Updated dependencies [[`6b6a907`](https://github.com/burnt-labs/xion.js/commit/6b6a907230b6c56d151e88a6b7371e13379bd19a)]:
  - @burnt-labs/signers@1.0.0-alpha.9
  - @burnt-labs/abstraxion-core@1.0.0-alpha.70

## 1.0.0-alpha.10

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
  - @burnt-labs/abstraxion-core@1.0.0-alpha.69
  - @burnt-labs/signers@1.0.0-alpha.8

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
