---
"@burnt-labs/abstraxion": minor
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/constants": patch
"@burnt-labs/signers": patch
"demo-app": minor
---

Add embedded wallets through iframe mode, also add with popup and auto authentication modes using traditional messaging. Also add the option to make a direct signing signing client (directly from smart account) using (`requireAuth`) flag.

## What's new

- **Popup mode** — opens auth app in a popup window; user stays on the dApp page, popup closes on success
- **Auto mode** — automatically picks popup (desktop) or redirect (mobile/PWA) based on device detection
- **Inline iframe mode** — embeds dashboard inside your page via `MessageChannel`-based communication (`IframeController`)
- **Direct signing (`requireAuth: true`)** — meta-account signs transactions directly instead of using session keys; user pays gas from their XION balance. For txs that wont be secure using session keys, like big transfers, smart account management etc.

Non user facing:
- **Signing clients per auth mode** — `PopupSigningClient`, `RedirectSigningClient`, `IframeSigningClient` for direct signing in each mode
- **`resolveAutoAuth` utility** — mobile/standalone detection heuristic (user-agent, touch, viewport, orientation, PWA)
- **Wrong-wallet signing guard** — prevents signing from a wallet that doesn't match the connected account
- **UTF-8-safe base64 encoding** — `toBase64`/`fromBase64` in `@burnt-labs/signers` for safe encoding of Unicode payloads (emoji, non-Latin scripts)
- **Treasury grant restoration fix** — handles ABCI REST format change that broke session restoration (`decodeRestFormatAuthorization` in abstraxion-core)
- **Iframe URL constants** — `getIframeUrl(chainId)` added to `@burnt-labs/constants` for per-chain iframe dashboard URLs
- **New core exports** — `MessageChannelManager`, `TypedEventEmitter`, `IframeMessageType`, `MessageTarget` from abstraxion-core; `AAClient`, `IframeController` from abstraxion

## Dashboard changes (xion-dashboard-app `feat/embedded-wallets`)

These dashboard changes are required for the new SDK modes to work:

- **Popup mode support** — dashboard can now run inside a popup window opened by the SDK, communicating auth results back via `postMessage` and closing automatically on success
- **Redirect-within-popup for OAuth** — when using popup mode, OAuth providers (Stytch) redirect inside the popup instead of opening yet another popup
- **SignTransactionView** — new view for approving individual transactions sent via `requireAuth` / direct signing (popup, redirect, and iframe modes)
- **Inline iframe mode** — dashboard renders inside an iframe with transparent background; old `IframeApp/` components removed in favor of the main app with `?iframe=true` search param
- **InlineConnectedView** — minimal connected-state view shown inside the iframe after successful auth
- **Origin validation on callbacks** — `postMessage` origin checks upgraded for security in iframe/popup communication
- **Wrong-address signing guard** — dashboard rejects signing requests if the requested signer doesn't match the logged-in account

## Packages changed

- **`@burnt-labs/abstraxion`** — new controllers (`PopupController`, `IframeController`), signing clients, auto mode resolution, expanded `useAbstraxionSigningClient` with `requireAuth` support, new type exports (`PopupAuthentication`, `AutoAuthentication`, `IframeAuthentication`, `SignResult`, `SigningClient`)
- **`@burnt-labs/abstraxion-core`** — `MessageChannelManager`, `TypedEventEmitter`, iframe message types, `decodeRestFormatAuthorization` grant decoding, treasury grant restoration fix
- **`@burnt-labs/constants`** — `getIframeUrl(chainId)`, iframe URL constants for mainnet/testnet
- **`@burnt-labs/signers`** — `toBase64`/`fromBase64` encoding utils, `ZKEmail` authenticator type support
- **`demo-app`** — new demos: `popup-demo/`, `inline-demo/`, `direct-signing-demo/` (with MetaMask via `useMetamask` hook)

For full details, usage examples, and migration guide see [`LATEST_VERSION_OVERVIEW.md`](../LATEST_VERSION_OVERVIEW.md) and the demo apps in [`apps/demo-app/`](../apps/demo-app/).
