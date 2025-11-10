# @burnt-labs/abstraxion-core

## UNRELEASED

### Major Changes

- Connector architecture and AA API v2 integration

  # New Features

  ## Connector System

  New connector-based architecture for flexible authentication:

  ```typescript
  // Connector types
  export interface Connector {
    type: ConnectorType;
    metadata: ConnectorMetadata;
    connect(): Promise<ConnectorConnectionResult>;
    disconnect(): Promise<void>;
  }

  // External signer connector
  export class ExternalSignerConnector implements Connector {
    // Connect using external auth providers (Turnkey, Privy, etc.)
  }

  // Connector registry
  export class ConnectorRegistry {
    registerConnector(connector: Connector): void;
    getConnector(type: ConnectorType): Connector | undefined;
  }
  ```

  ## AA API v2 Client
  - New `api/client.ts` - HTTP client for AA API v2
  - New `api/createAccount.ts` - Account creation utilities
  - Supports both POST and GET account creation methods
  - Enhanced error handling and validation

  ## Configuration Validation
  - New `config/validation.ts` - Configuration schema validation
  - Type-safe configuration with runtime checks
  - Improved error messages for misconfigurations

  ## Enhanced AbstraxionAuth
  - Improved authentication flow with better state management
  - Support for multiple authentication modes
  - Enhanced grant verification and validation

  ## GranteeSignerClient Improvements
  - Additional utility methods for account management
  - Better integration with connector system
  - Improved error handling

  # API Changes

  **New exports:**

  ```typescript
  // Connectors
  export * from "./connectors";
  -Connector -
    ConnectorType -
    ConnectorMetadata -
    ConnectorConfig -
    ConnectorConnectionResult -
    ExternalSignerConnector -
    ConnectorRegistry;

  // API utilities
  export * from "./api";
  -createAAClient - createAccount;

  // Configuration
  export * from "./config";
  -validateConfig;

  // Config utilities
  export { fetchConfig, clearConfigCache } from "./utils/configUtils";
  ```

  **Import path fixes:**
  - Fixed relative imports to use correct paths (removed `@/` aliases in exports)

  # Internal Improvements
  - Enhanced test coverage with mock data utilities
  - Better TypeScript configuration
  - Improved build output with tsup

### Patch Changes

- Updated dependencies:
  - `@burnt-labs/constants@*`

## 1.0.0-alpha.60

### Major Changes

- [#305](https://github.com/burnt-labs/xion.js/pull/305) [`1fe18d9`](https://github.com/burnt-labs/xion.js/commit/1fe18d970666b0c448427fda55d5e7764059174b) Thanks [@BurntVal](https://github.com/BurntVal)! - # Breaking Changes

  ## React Native Crypto Setup Required

  ### What Changed
  - Added React Native support with `quickCrypto` fallback for KDF operations
  - Made `executeKdf` method static in `SignArbSecp256k1HdWallet`
  - Made `createWithSigner` method synchronous (removed async/await)

  ### Migration Guide

  #### For React Native Apps

  You must now install and configure crypto dependencies:

  ```bash
  npm install react-native-get-random-values react-native-quick-crypto
  ```

  Add this to your app's entry point (before any Abstraxion imports):

  ```typescript
  import "react-native-get-random-values";
  import crypto from "react-native-quick-crypto";

  // Set up global crypto for React Native
  if (
    typeof global !== "undefined" &&
    global.navigator?.product === "ReactNative"
  ) {
    global.quickCrypto = crypto;
  }
  ```

  #### For Web Apps

  No changes required - existing functionality remains the same.

### Patch Changes

- Updated dependencies [[`1fe18d9`](https://github.com/burnt-labs/xion.js/commit/1fe18d970666b0c448427fda55d5e7764059174b)]:
  - @burnt-labs/constants@0.1.0-alpha.19

## 1.0.0-alpha.59

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

- [#306](https://github.com/burnt-labs/xion.js/pull/306) [`fa64a3f`](https://github.com/burnt-labs/xion.js/commit/fa64a3f3811c4d175c272d526f93b88ad564c975) Thanks [@burnt-sun](https://github.com/burnt-sun)! - move url manipulation to strategies.

- Updated dependencies [[`82e2876`](https://github.com/burnt-labs/xion.js/commit/82e28763ca97805cc6d24b0402af2a2b28f56bf1), [`e88eca8`](https://github.com/burnt-labs/xion.js/commit/e88eca8d15714d9c0e266f9fccc009610e9f353c)]:
  - @burnt-labs/constants@0.1.0-alpha.18

## 1.0.0-alpha.58

### Minor Changes

- [#299](https://github.com/burnt-labs/xion.js/pull/299) [`b38363b`](https://github.com/burnt-labs/xion.js/commit/b38363b7f180e9240abf89ee4e64ca3475d07e7a) Thanks [@BurntVal](https://github.com/BurntVal)! - Add ibc transfer authorization logic to exported utils

## 1.0.0-alpha.57

### Minor Changes

- [#288](https://github.com/burnt-labs/xion.js/pull/288) [`c8d253c`](https://github.com/burnt-labs/xion.js/commit/c8d253cef6dd5e1ecfb7c1a217d5a4c3e67eb8ba) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix issue where we weren't accounting for values that decrement

- [#290](https://github.com/burnt-labs/xion.js/pull/290) [`0005d94`](https://github.com/burnt-labs/xion.js/commit/0005d94c254a64d712fa25e981364386c5c5dcd3) Thanks [@BurntVal](https://github.com/BurntVal)! - consolidate grant utility functions & improve grant decoding logic

## 1.0.0-alpha.56

### Patch Changes

- [#285](https://github.com/burnt-labs/xion.js/pull/285) [`0671c16`](https://github.com/burnt-labs/xion.js/commit/0671c1642fb2ab2241aeed4ce0daaecfd46c228a) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix mismatch between rest and rpc endpoint grant queries

## 1.0.0-alpha.55

### Minor Changes

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`5572077`](https://github.com/burnt-labs/xion.js/commit/557207735cece8a6050e9fb4aff4b398e3467cdb) Thanks [@burnt-sun](https://github.com/burnt-sun)! - Chore: apply prettier formatting.

### Patch Changes

- [#282](https://github.com/burnt-labs/xion.js/pull/282) [`3629b75`](https://github.com/burnt-labs/xion.js/commit/3629b750fa319205bab4c94d7252eda41484509f) Thanks [@BurntVal](https://github.com/BurntVal)! - Replace Buffer with toByteArray

- Updated dependencies [[`f2d6e5a`](https://github.com/burnt-labs/xion.js/commit/f2d6e5a8abf36d0bae7ffc85ad16552ad58ef5aa)]:
  - @burnt-labs/constants@0.1.0-alpha.17

## 1.0.0-alpha.54

### Minor Changes

- [#278](https://github.com/burnt-labs/xion.js/pull/278) [`86c23e3`](https://github.com/burnt-labs/xion.js/commit/86c23e33ad080fcb465453564e1df93762efb75f) Thanks [@BurntVal](https://github.com/BurntVal)! - introduces enhancements to the AbstraxionAuth class and its associated test suite. The changes aim to improve the functionality and reliability of the authentication process, particularly in handling and verifying grants.

### Patch Changes

- [#277](https://github.com/burnt-labs/xion.js/pull/277) [`cfd3e01`](https://github.com/burnt-labs/xion.js/commit/cfd3e01e1ee3b161184a415debb5b87888a65549) Thanks [@justinbarry](https://github.com/justinbarry)! - \* Upgrade @cosmjs packages from 0.32.4 to 0.33.1 to support Comet38.
  - Reduce calls to RPC status endpoint.

- [#275](https://github.com/burnt-labs/xion.js/pull/275) [`7228469`](https://github.com/burnt-labs/xion.js/commit/72284694eb61be083829488e8916e46e9836b4e6) Thanks [@justinbarry](https://github.com/justinbarry)! - Move customAccountFromAny function from deprecated @burnt-labs/signers package to abstraxion-core to remove the dependency.

## 1.0.0-alpha.53

### Major Changes

- [#270](https://github.com/burnt-labs/xion.js/pull/270) [`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659) Thanks [@BurntVal](https://github.com/BurntVal)! - implement strategy patterns for storage and redirect operations

### Patch Changes

- Updated dependencies [[`be7b831`](https://github.com/burnt-labs/xion.js/commit/be7b83152baff11d025f09efe7ddaa173768f659)]:
  - @burnt-labs/constants@0.1.0-alpha.16
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.52

### Patch Changes

- Updated dependencies [[`41aa337`](https://github.com/burnt-labs/xion.js/commit/41aa3376963d394eae5dbd3356b61ceb71fe8db4), [`5f8bd03`](https://github.com/burnt-labs/xion.js/commit/5f8bd033ce2845ea74dfbb8cb4380aa5745e19f1)]:
  - @burnt-labs/constants@0.1.0-alpha.15
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.51

### Minor Changes

- [#237](https://github.com/burnt-labs/xion.js/pull/237) [`cff2a3e`](https://github.com/burnt-labs/xion.js/commit/cff2a3e7eabdb1ab217ea7410ca30abfc81e8401) Thanks [@BurntVal](https://github.com/BurntVal)! - implement extended grant checks for legacy grant configs and treasury contracts

## 1.0.0-alpha.50

### Minor Changes

- [#243](https://github.com/burnt-labs/xion.js/pull/243) [`9fad9c4`](https://github.com/burnt-labs/xion.js/commit/9fad9c415c3131a9b7f4fbc837d299e7cb33fd0d) Thanks [@BurntVal](https://github.com/BurntVal)! - GranteeSignerClient simulate extension for fee granter param

- [#254](https://github.com/burnt-labs/xion.js/pull/254) [`ad2160d`](https://github.com/burnt-labs/xion.js/commit/ad2160d2b5c8192c7b838a477454f64be14ad79c) Thanks [@BurntVal](https://github.com/BurntVal)! - Remove keplr dependencies to resolve related bugs

## 1.0.0-alpha.49

### Minor Changes

- [#239](https://github.com/burnt-labs/xion.js/pull/239) [`6ca7dad`](https://github.com/burnt-labs/xion.js/commit/6ca7dad417a01b4a2594cdf4f935966cab62d442) Thanks [@BurntVal](https://github.com/BurntVal)! - simulation fix and granter override

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [[`5f5edf4`](https://github.com/burnt-labs/xion.js/commit/5f5edf4cf38546b9f726af9b685ea1ce39444551)]:
  - @burnt-labs/constants@0.1.0-alpha.14
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.47

### Minor Changes

- [#228](https://github.com/burnt-labs/xion.js/pull/228) [`bfdc30e`](https://github.com/burnt-labs/xion.js/commit/bfdc30e16b4028a561c7f1608f94fdec9faf8f83) Thanks [@BurntVal](https://github.com/BurntVal)! - Added a grant validity check to verify expiration

## 1.0.0-alpha.46

### Minor Changes

- [#218](https://github.com/burnt-labs/xion.js/pull/218) [`1e3bd4e`](https://github.com/burnt-labs/xion.js/commit/1e3bd4eb46d730f6a7e7dd31fa1728c78bac1d97) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce treasury contract parameter. Look into the Abstraxion/README or the demo-app/layout for more information

### Patch Changes

- Updated dependencies [[`147c8db`](https://github.com/burnt-labs/xion.js/commit/147c8dbe36b030edd4d97edcbb1a0f1674103011)]:
  - @burnt-labs/constants@0.1.0-alpha.13
  - @burnt-labs/signers@0.1.0-alpha.13

## 1.0.0-alpha.45

### Minor Changes

- [#219](https://github.com/burnt-labs/xion.js/pull/219) [`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade cosmjs dependencies to fix raw log parsing error

### Patch Changes

- Updated dependencies [[`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7), [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069)]:
  - @burnt-labs/signers@0.1.0-alpha.13
  - @burnt-labs/constants@0.1.0-alpha.12

## 1.0.0-alpha.44

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

- [#150](https://github.com/burnt-labs/xion.js/pull/150) [`2df184a`](https://github.com/burnt-labs/xion.js/commit/2df184a661f74f6a9a412336f7df271d9f6f4b9c) Thanks [@justinbarry](https://github.com/justinbarry)! - Add a return type to SignArbSecp256k1HdWallet's `getAccounts` method

- Updated dependencies [[`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a), [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267), [`78cf088`](https://github.com/burnt-labs/xion.js/commit/78cf0886ccc1a4c023642c4a7d87f9196d637940)]:
  - @burnt-labs/constants@0.1.0-alpha.11
  - @burnt-labs/signers@0.1.0-alpha.12

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [[`e9dd176`](https://github.com/burnt-labs/xion.js/commit/e9dd1766dbfe4994948e028b51c07eb6dd52cced)]:
  - @burnt-labs/constants@0.1.0-alpha.10

## 1.0.0-alpha.42

### Minor Changes

- [#190](https://github.com/burnt-labs/xion.js/pull/190) [`bcc35c9`](https://github.com/burnt-labs/xion.js/commit/bcc35c9ed8faf2edb6f1e19f06e8b8ced9530067) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce configurable redirect url param

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

### Patch Changes

- Updated dependencies [[`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060), [`a0b5031`](https://github.com/burnt-labs/xion.js/commit/a0b5031f8766369b00562387b692450f396a9d7f)]:
  - @burnt-labs/constants@0.1.0-alpha.9
  - @burnt-labs/signers@0.1.0-alpha.11

## 1.0.0-alpha.41

### Minor Changes

- [#174](https://github.com/burnt-labs/xion.js/pull/174) [`b3ecf24`](https://github.com/burnt-labs/xion.js/commit/b3ecf24cf8c240c2b0c721ed803decca9f6a91a4) Thanks [@BurntVal](https://github.com/BurntVal)! - Refactor abstraxion to implement core; clean up and fix AbstraxionAuth class; impl unit tests for AbstraxionAuth

## 1.0.0-alpha.40

### Minor Changes

- [#162](https://github.com/burnt-labs/xion.js/pull/162) [`f018dc1`](https://github.com/burnt-labs/xion.js/commit/f018dc124615bbf467abbea35cb656852233593d) Thanks [@BurntVal](https://github.com/BurntVal)! - Improve polling mechanism

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [[`bed091d`](https://github.com/burnt-labs/xion.js/commit/bed091d74557457efb681734a27b46d97cdefbbe)]:
  - @burnt-labs/signers@0.1.0-alpha.10

## 1.0.0-alpha.38

### Minor Changes

- [#139](https://github.com/burnt-labs/xion.js/pull/139) [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582) Thanks [@BurntVal](https://github.com/BurntVal)! - Extend abstraxion-core to allow for framework agnostic implementations

### Patch Changes

- Updated dependencies [[`958f66a`](https://github.com/burnt-labs/xion.js/commit/958f66ab7b82bdbb8a591d16b2cc399859e8508b), [`4c230d8`](https://github.com/burnt-labs/xion.js/commit/4c230d82f20b934acd77ea102e45a29ad3e148ae), [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582), [`8ec1c5b`](https://github.com/burnt-labs/xion.js/commit/8ec1c5b752f8136c9e6ba7fcfec16e85542d7c21)]:
  - @burnt-labs/constants@0.1.0-alpha.8

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [[`8de24aa`](https://github.com/burnt-labs/xion.js/commit/8de24aa187e9316c9cf9a1f431f08e4ae629842e), [`12b995f`](https://github.com/burnt-labs/xion.js/commit/12b995f5c3216bad7537d4232ea2bbd2340ced32)]:
  - @burnt-labs/constants@0.1.0-alpha.7

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [[`6978612`](https://github.com/burnt-labs/xion.js/commit/697861259eff1199d143f79c7d8c0666eec4760b)]:
  - @burnt-labs/signers@0.1.0-alpha.9

## 1.0.0-alpha.35

### Minor Changes

- [#118](https://github.com/burnt-labs/xion.js/pull/118) [`fafb2af`](https://github.com/burnt-labs/xion.js/commit/fafb2af44b647dcfce3bccd9b91b6d0ffefc4ed0) Thanks [@justinbarry](https://github.com/justinbarry)! - Add `getGranteeAccountData` method to the GranteeSignerClient class

## 1.0.0-alpha.34

### Minor Changes

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Impl Ethereum authenticator and signer

- [#103](https://github.com/burnt-labs/xion.js/pull/103) [`ace50e5`](https://github.com/burnt-labs/xion.js/commit/ace50e507e5d33b75092e3c4823ba0c5c6ad04d2) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Added sign arb demo to demo app and made granteeAddress readable in GranteeSignerClient.

### Patch Changes

- Updated dependencies [[`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77)]:
  - @burnt-labs/signers@0.1.0-alpha.8

## 1.0.0-alpha.33

### Patch Changes

- Updated dependencies [[`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4)]:
  - @burnt-labs/signers@0.1.0-alpha.7

## 1.0.0-alpha.32

### Minor Changes

- [#94](https://github.com/burnt-labs/xion.js/pull/94) [`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update the following packages to the latest version:

  | Package                   | Version |
  | ------------------------- | ------- |
  | @cosmjs/cosmwasm-stargate | ^0.32.2 |
  | @cosmjs/proto-signing     | ^0.32.2 |
  | @cosmjs/stargate          | ^0.32.2 |
  | @cosmjs/tendermint-rpc    | ^0.32.2 |
  | cosmjs-types              | ^0.9.0  |

### Patch Changes

- Updated dependencies [[`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e)]:
  - @burnt-labs/signers@0.1.0-alpha.6

## 1.0.0-alpha.31

### Patch Changes

- Updated dependencies [[`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8)]:
  - @burnt-labs/constants@0.1.0-alpha.6

## 1.0.0-alpha.30

### Minor Changes

- [#92](https://github.com/burnt-labs/xion.js/pull/92) [`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa) Thanks [@Peartes](https://github.com/Peartes)! - Pull GranteeSignerClient into a separate "core" package to help others reproduce abstraxion functionality
