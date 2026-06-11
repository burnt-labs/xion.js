# @burnt-labs/abstraxion-js

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
