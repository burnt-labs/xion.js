---
"@burnt-labs/constants": minor
"@burnt-labs/account-management": major
"@burnt-labs/abstraxion-js": major
"@burnt-labs/abstraxion-react-native": major
---

Apps configure only the network. `network: "mainnet" | "testnet"` resolves the chain ID, RPC, REST, gas price, fee granter, treasury indexer and, in signer mode, the AA API URL and address prefix:

```ts
{
  network: "mainnet",
  treasury: "xion1...", // optional, app-specific
  authentication: { type: "signer", getSignerConfig },
}
```

- `@burnt-labs/constants`: new `XionNetwork`, `isXionNetwork`, `getChainIdForNetwork` (`mainnet` → `xion-mainnet-1`, `testnet` → `xion-testnet-2`), `getAaApiUrl` (`https://aa-api.mainnet.burnt.com`, `https://aa-api.testnet.burnt.com`) and `getAddressPrefix`.
- `@burnt-labs/abstraxion-js`: `AbstraxionConfig.network` added and `chainId` made optional. Set one of them; if both are set they must name the same chain, otherwise normalization throws, and an unknown network also throws. In signer mode, `authentication.aaApiUrl` and `authentication.smartAccountContract` are optional overrides. `smartAccountContract.codeId` is deprecated and ignored, because the AA API and the chain report each account's code ID. Account creation no longer depends on `feeGranter`, since the AA API pays for new accounts with its own fee granter. A custom chain needs `feeGranter` only when grants are configured. A chain with no default AA API needs `aaApiUrl`, and the error names it. `createAccountCreationConfigFromConfig` no longer returns `codeId`. `XionNetwork` is re-exported.
- **Breaking (alpha line):** code that reads `AbstraxionConfig.chainId`, `SignerAuthentication.aaApiUrl` / `smartAccountContract`, or the `codeId` from `createAccountCreationConfigFromConfig` now sees optional values (read `NormalizedAbstraxionConfig.chainId` for the resolved chain). A signer config without `smartAccountContract` on mainnet or testnet now discovers and creates accounts through the network's AA API. Indexer-only discovery (no creation) remains for a chain with no AA API and no `smartAccountContract`.
- `@burnt-labs/account-management`: `SmartAccountContractConfig.codeId` and `AccountCreationConfig.feeGranter` are optional (deprecated). Code that reads them now sees `number | undefined` / `string | undefined`.
- `@burnt-labs/abstraxion-react-native`: the provider accepts `network` without `chainId`. With neither set, it still defaults to testnet.

Existing configs that pass `chainId`, `aaApiUrl`, `smartAccountContract: { codeId, addressPrefix }` and `feeGranter` keep working unchanged.
