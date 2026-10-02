---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/account-management": minor
"@burnt-labs/abstraxion-js": minor
---

feat: derive smart-account addresses from the chain's x/abstractaccount `address_derivation_hash`

Since xion v31 the chain derives every new abstract-account address from the module param `address_derivation_hash` (immutable once set), not from the account code's checksum. The SDK now reads it over RPC (`/abstractaccount.v1.Query/Params`) and caches it per chain id.

- `@burnt-labs/abstraxion-core`: new `resolveAddressDerivation` / `resolveSmartAccountChecksum` and `AddressDerivationMismatchError`. `createEthWalletAccount` / `createSecp256k1Account` accept the checksum as a string or as an async resolver, and warn when the AA API returns a different account than the one derived locally.
- `@burnt-labs/account-management`: `SmartAccountContractConfig.checksum` is now optional and only a pin. `connectAccount` resolves the checksum from the chain before signing. `RpcAccountStrategy` resolves it from the chain too, and also checks the address for each allowed code's data_hash, so accounts registered before v31 stay discoverable (`legacyChecksums` adds extra candidates).
- `@burnt-labs/abstraxion-js`: `createAccountStrategyFromConfig` passes the chain id and RPC URL through, so discovery and creation use the chain value.

A configured `smartAccountContract.checksum` that disagrees with the chain now throws `AddressDerivationMismatchError` during discovery and creation, where it used to derive an address the chain never registers. Remove the checksum from config, or set it to the chain's value. If the chain cannot be reached, the pin is used with a warning.
