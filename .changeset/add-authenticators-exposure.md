---
"@burnt-labs/abstraxion": minor
"@burnt-labs/abstraxion-core": patch
"@burnt-labs/signers": minor
---

Expose AddAuthenticators flow through abstraxion SDK; improve TX payload encoding and validation

## New public API

- **`useAddAuthenticators()`** — new hook that opens the dashboard add-authenticator flow in popup, iframe (embedded), and redirect modes. Returns `{ addAuthenticators, isSupported, addAuthResult, clearAddAuthResult }`.
- **`AddAuthResult`** — new exported type for the redirect-mode result (`{ success: true } | { success: false; error: string }`).
- **`UseAddAuthenticatorsReturn`** — type export for the hook's return shape.

## SDK internals

- `PopupController.promptAddAuthenticators(signerAddress)` — opens a popup to the dashboard `add-authenticators` view; resolves on `ADD_AUTHENTICATOR_SUCCESS`, rejects on cancel/error. Timeout: 10 min.
- `IframeController.promptAddAuthenticators(signerAddress)` — sends `ADD_AUTHENTICATOR` via `MessageChannelManager` to the embedded iframe; resolves when the user completes the flow.
- `RedirectController.promptAddAuthenticators(signerAddress)` — navigates to the dashboard add-auth page; result available via `addAuthResult` store after return.
- `RedirectController.addAuthResult` — new `ResultStore<AddAuthResult>` (parallel to `signResult`). Subscribe, snapshot, and clear follow the same `useSyncExternalStore`-compatible pattern.
- `waitForPopupMessage<T>` — shared private helper in `PopupController` that eliminates duplicated popup-message-waiting boilerplate across sign and add-auth flows.
- `DashboardMessageType` — three new enum values: `ADD_AUTHENTICATOR_SUCCESS`, `ADD_AUTHENTICATOR_REJECTED`, `ADD_AUTHENTICATOR_ERROR`.

## TX payload utils (`@burnt-labs/signers`)

- **`validateTxPayload(payload, context)`** — pre-flight validation for transaction payloads before encoding/transport; logs issues without throwing so dev mistakes surface early.
- **`normalizeMessages(messages)`** — dashboard-side normalization that converts post-JSON-transport CosmWasm `msg` fields from plain objects back to `Uint8Array` for protobuf encoding.
- **`TxTransportPayload`** — shared type for the wire format used by popup, redirect, and iframe signing flows.
- **`getTreasuryParamsMetadata(params)`** — backward-compat helper that returns `metadata` with fallback to `display_url` for pre-upgrade indexer responses.

## Refactors

- `resolveAuthAppUrl` and `buildDashboardUrl` extracted to `controllers/utils.ts`; used by both `PopupController` and `RedirectController`, removing duplicated `fetchConfig` call sites.
- `ResultStore<T>` in `RedirectController` replaces the bespoke `signResult_` / `signResultSubscribers_` pattern, making both sign and add-auth results consistent.
