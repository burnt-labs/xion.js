---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/account-management": major
"@burnt-labs/abstraxion-js": minor
"@burnt-labs/abstraxion-react-native": patch
---

Smart-account addresses now come from the AA API. Signer mode no longer derives addresses in the SDK and no longer needs a contract checksum:

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
- **Breaking (alpha line):** `RpcAccountStrategy` is now a deprecated adapter over `AAApiAccountStrategy` v2. It throws a migration error unless `aaApiUrl` is passed; `checksum`, `creator` and `codeId` are accepted but ignored. Signer-config users already pass `aaApiUrl` and need no change.
- `@burnt-labs/abstraxion-js`: signer mode discovers accounts only through the AA API v2 strategy and creates them with the aa-api address source; `signer.indexer` is no longer used for signer-mode discovery. `createAccountCreationConfigFromConfig` returns a config without a checksum.
- `@burnt-labs/abstraxion-react-native`: re-exports the signer config type, so `smartAccountContract.checksum` is optional in its published declarations too.

There is no legacy-checksum fallback. Accounts the AA API returns through its ordinary lookup are found regardless of age, and mainnet pre-v31 addresses are unchanged. A few historical testnet accounts created under an older checksum have no dedicated recovery path.
