# @burnt-labs/account-management

## 1.0.0-alpha.3

### Minor Changes

- [#326](https://github.com/burnt-labs/xion.js/pull/326) [`45e3a7b`](https://github.com/burnt-labs/xion.js/commit/45e3a7b6cb83b5fb812a382e09073285f32303d5) Thanks [@ertemann](https://github.com/ertemann)! - expose extra type and add ADR wrap to secp256k1 verification so to allow signers like keplr/okx

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
