# @burnt-labs/abstraxion-js

## 1.0.0-alpha.4

### Minor Changes

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
  - @burnt-labs/account-management@1.0.0-alpha.15
  - @burnt-labs/signers@1.0.0-alpha.12

## 1.0.0-alpha.3

### Patch Changes

- Updated dependencies [[`297beee`](https://github.com/burnt-labs/xion.js/commit/297beee2d5b7f17cebb28d8c3ae82bbb090748ff), [`d17c427`](https://github.com/burnt-labs/xion.js/commit/d17c4277596cac0edbcfdfbfc881443b47c1be0b), [`8014042`](https://github.com/burnt-labs/xion.js/commit/80140420ad70e3ec35711d7f361412ac27308f39), [`1e4b0e7`](https://github.com/burnt-labs/xion.js/commit/1e4b0e7edc8232a956ad98dcf47a52f97ee4d273)]:
  - @burnt-labs/constants@0.1.0-alpha.25
  - @burnt-labs/account-management@1.0.0-alpha.14
  - @burnt-labs/abstraxion-core@1.0.0-alpha.73
  - @burnt-labs/signers@1.0.0-alpha.11

## 1.0.0-alpha.2

### Patch Changes

- Updated dependencies [[`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c), [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c), [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c), [`8905566`](https://github.com/burnt-labs/xion.js/commit/89055662d91e4a4e1bf64f990f494cee3db3a76c)]:
  - @burnt-labs/account-management@1.0.0-alpha.13
  - @burnt-labs/signers@1.0.0-alpha.10
  - @burnt-labs/abstraxion-core@1.0.0-alpha.72

## 1.0.0-alpha.1

### Major Changes

- [#369](https://github.com/burnt-labs/xion.js/pull/369) [`4b655df`](https://github.com/burnt-labs/xion.js/commit/4b655df245495ad4d946ee3b5d874361cb97425d) Thanks [@ertemann](https://github.com/ertemann)! - feat(abstraxion-js): new framework-agnostic package. Controllers (Base/Iframe/Popup/Redirect/Signer), strategies, signing (`RequireSigningClient`), and config/util helpers are extracted here from `@burnt-labs/abstraxion` so non-React consumers can use the SDK without pulling in React.

- [#372](https://github.com/burnt-labs/xion.js/pull/372) [`a4336ec`](https://github.com/burnt-labs/xion.js/commit/a4336ec4d63da10a6973b268246ef733aebd94f2) Thanks [@ertemann](https://github.com/ertemann)! - feat(abstraxion-js): extract `createAbstraxionRuntime` — a framework-agnostic runtime (subscribe/login/logout/manageAuthenticators + `createReadClient`/`createDirectSigningClient`) that React, React Native, and the Svelte/vanilla demos all consume, removing duplicated controller-narrowing logic. Adds React Native embedded (WebView iframe) transport strategies and unifies the hook surface.

### Patch Changes

- Updated dependencies [[`868bb10`](https://github.com/burnt-labs/xion.js/commit/868bb106962b709555c94bf53c5318367a6b7439), [`868bb10`](https://github.com/burnt-labs/xion.js/commit/868bb106962b709555c94bf53c5318367a6b7439)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.71
  - @burnt-labs/account-management@1.0.0-alpha.12
