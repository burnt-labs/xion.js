# @burnt-labs/abstraxion-react-native

## 1.0.0-alpha.7

### Minor Changes

- [#296](https://github.com/burnt-labs/xion.js/pull/296) [`82e2876`](https://github.com/burnt-labs/xion.js/commit/82e28763ca97805cc6d24b0402af2a2b28f56bf1) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove rest_url param from provider

- [#291](https://github.com/burnt-labs/xion.js/pull/291) [`e88eca8`](https://github.com/burnt-labs/xion.js/commit/e88eca8d15714d9c0e266f9fccc009610e9f353c) Thanks [@justinbarry](https://github.com/justinbarry)! - - **RPC Configuration:**
  - Added caching with 5-minute TTL to RPC config fetches, reducing redundant network requests
  - Added `clearConfigCache()` function for manual cache invalidation
  - **Treasury Grant Data:**
    - Introduced caching with 10-minute TTL for treasury data fetches
    - Added new function to fetch treasury grant data directly from the DaoDao indexer
    - Indexer URL is now configurable via `indexerUrl` parameter in provider configuration
    - Unified and simplified the treasury grant config API with improved fallback mechanisms
    - Added response validation for indexer data with proper type checking
    - Added `clearTreasuryCache()` function for manual cache invalidation
  - **Error Handling:**
    - Added specific error types: `TreasuryError`, `IndexerError`, `IndexerNetworkError`, `IndexerResponseError`, `TreasuryConfigError`, and `TreasuryValidationError`
    - Improved error logging with contextual information (status codes, URLs)
  - **Authentication:**
    - Fixed race condition in authentication with proper Promise-based queueing
    - Multiple concurrent authentication attempts now properly wait for the first to complete
  - **Refactoring:**
    - Replaced direct CosmWasmClient usage with a modular RPC client utility to eliminate RPC `status` calls on startup
    - Simplified deprecated functions to delegate to the new unified `getTreasuryGrantConfigs` function
    - Cleaned up and reorganized imports for better code clarity

### Patch Changes

- Updated dependencies [[`82e2876`](https://github.com/burnt-labs/xion.js/commit/82e28763ca97805cc6d24b0402af2a2b28f56bf1), [`e88eca8`](https://github.com/burnt-labs/xion.js/commit/e88eca8d15714d9c0e266f9fccc009610e9f353c), [`fa64a3f`](https://github.com/burnt-labs/xion.js/commit/fa64a3f3811c4d175c272d526f93b88ad564c975)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.59
  - @burnt-labs/constants@0.1.0-alpha.18

## 1.0.0-alpha.6

### Patch Changes

- Updated dependencies [[`b38363b`](https://github.com/burnt-labs/xion.js/commit/b38363b7f180e9240abf89ee4e64ca3475d07e7a)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.58

## 1.0.0-alpha.5

### Patch Changes

- Updated dependencies [[`c8d253c`](https://github.com/burnt-labs/xion.js/commit/c8d253cef6dd5e1ecfb7c1a217d5a4c3e67eb8ba), [`0005d94`](https://github.com/burnt-labs/xion.js/commit/0005d94c254a64d712fa25e981364386c5c5dcd3)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.57

## 1.0.0-alpha.4

### Patch Changes

- Updated dependencies [[`0671c16`](https://github.com/burnt-labs/xion.js/commit/0671c1642fb2ab2241aeed4ce0daaecfd46c228a)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.56

## 1.0.0-alpha.3

### Patch Changes

- [#283](https://github.com/burnt-labs/xion.js/pull/283) [`5feab68`](https://github.com/burnt-labs/xion.js/commit/5feab68d40533214cf7c01a6d52cfcf23a6fdd9d) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove references to deprecated `@burnt-labs/signers` package

## 1.0.0-alpha.2

### Patch Changes

- Updated dependencies [[`f2d6e5a`](https://github.com/burnt-labs/xion.js/commit/f2d6e5a8abf36d0bae7ffc85ad16552ad58ef5aa), [`d390f1e`](https://github.com/burnt-labs/xion.js/commit/d390f1e4df207cde79056b7919965b0f2e473f3d), [`5572077`](https://github.com/burnt-labs/xion.js/commit/557207735cece8a6050e9fb4aff4b398e3467cdb), [`3629b75`](https://github.com/burnt-labs/xion.js/commit/3629b750fa319205bab4c94d7252eda41484509f)]:
  - @burnt-labs/constants@0.1.0-alpha.17
  - @burnt-labs/signers@0.1.0-alpha.14
  - @burnt-labs/abstraxion-core@1.0.0-alpha.55

## 1.0.0-alpha.1

### Patch Changes

- [#277](https://github.com/burnt-labs/xion.js/pull/277) [`cfd3e01`](https://github.com/burnt-labs/xion.js/commit/cfd3e01e1ee3b161184a415debb5b87888a65549) Thanks [@justinbarry](https://github.com/justinbarry)! - \* Upgrade @cosmjs packages from 0.32.4 to 0.33.1 to support Comet38.
  - Reduce calls to RPC status endpoint.
- Updated dependencies [[`86c23e3`](https://github.com/burnt-labs/xion.js/commit/86c23e33ad080fcb465453564e1df93762efb75f), [`cfd3e01`](https://github.com/burnt-labs/xion.js/commit/cfd3e01e1ee3b161184a415debb5b87888a65549), [`7228469`](https://github.com/burnt-labs/xion.js/commit/72284694eb61be083829488e8916e46e9836b4e6)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.54

## 1.0.0-alpha.0

### Major Changes

- [#274](https://github.com/burnt-labs/xion.js/pull/274) [`0ab1773`](https://github.com/burnt-labs/xion.js/commit/0ab17737b0fd5a8a3027f7b3b90217e3a3180b64) Thanks [@BurntVal](https://github.com/BurntVal)! - Addition of the abstraxion-react-native package. View README for more information

### Patch Changes

- Updated dependencies [[`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.53
  - @burnt-labs/constants@0.1.0-alpha.16
  - @burnt-labs/signers@0.1.0-alpha.13
