# @burnt-labs/abstraxion-js

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
