# @burnt-labs/constants

## 0.1.0-alpha.14

### Minor Changes

- [#240](https://github.com/burnt-labs/xion.js/pull/240) [`5f5edf4`](https://github.com/burnt-labs/xion.js/commit/5f5edf4cf38546b9f726af9b685ea1ce39444551) Thanks [@justinbarry](https://github.com/justinbarry)! - Update default gas price to 0.001uxion

## 0.1.0-alpha.13

### Patch Changes

- [#226](https://github.com/burnt-labs/xion.js/pull/226) [`147c8db`](https://github.com/burnt-labs/xion.js/commit/147c8dbe36b030edd4d97edcbb1a0f1674103011) Thanks [@2xburnt](https://github.com/2xburnt)! - Update index.ts to use our rpc domain

## 0.1.0-alpha.12

### Minor Changes

- [#216](https://github.com/burnt-labs/xion.js/pull/216) [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix under simulation

## 0.1.0-alpha.11

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

## 0.1.0-alpha.10

### Minor Changes

- [#198](https://github.com/burnt-labs/xion.js/pull/198) [`e9dd176`](https://github.com/burnt-labs/xion.js/commit/e9dd1766dbfe4994948e028b51c07eb6dd52cced) Thanks [@BurntVal](https://github.com/BurntVal)! - Update chainInfo vars across monorepo. Please view the abstraxion package readme for more info on opting into mainnet

## 0.1.0-alpha.9

### Minor Changes

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

## 0.1.0-alpha.8

### Minor Changes

- [#151](https://github.com/burnt-labs/xion.js/pull/151) [`958f66a`](https://github.com/burnt-labs/xion.js/commit/958f66ab7b82bdbb8a591d16b2cc399859e8508b) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Broke out grant flow to unique app.

- [#134](https://github.com/burnt-labs/xion.js/pull/134) [`4c230d8`](https://github.com/burnt-labs/xion.js/commit/4c230d82f20b934acd77ea102e45a29ad3e148ae) Thanks [@BurntVal](https://github.com/BurntVal)! - Add Authenticator Modal & Fresh User Dashboard Flow

- [#139](https://github.com/burnt-labs/xion.js/pull/139) [`f09cc0b`](https://github.com/burnt-labs/xion.js/commit/f09cc0b7167e41673f7aeb0ce317896e2e4b5582) Thanks [@BurntVal](https://github.com/BurntVal)! - Extend abstraxion-core to allow for framework agnostic implementations

- [#141](https://github.com/burnt-labs/xion.js/pull/141) [`8ec1c5b`](https://github.com/burnt-labs/xion.js/commit/8ec1c5b752f8136c9e6ba7fcfec16e85542d7c21) Thanks [@justinbarry](https://github.com/justinbarry)! - Transition from dashboard.burnt.com to settings.burnt.com to help us ready for splitting the dashboard apart

## 0.1.0-alpha.7

### Minor Changes

- [#121](https://github.com/burnt-labs/xion.js/pull/121) [`12b995f`](https://github.com/burnt-labs/xion.js/commit/12b995f5c3216bad7537d4232ea2bbd2340ced32) Thanks [@BurntVal](https://github.com/BurntVal)! - Refactor Abstraxion to fetch config

### Patch Changes

- [#137](https://github.com/burnt-labs/xion.js/pull/137) [`8de24aa`](https://github.com/burnt-labs/xion.js/commit/8de24aa187e9316c9cf9a1f431f08e4ae629842e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update casing of "XION" from across multiple components

## 0.1.0-alpha.6

### Minor Changes

- [#97](https://github.com/burnt-labs/xion.js/pull/97) [`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8) Thanks [@justinbarry](https://github.com/justinbarry)! - Update default RPC/Rest Urls and allow for dapps to pass in rest url via the AbstraxionProvider.

  ```typescript
          <AbstraxionProvider
            config={{
              restUrl: "https://api.example.com",
            }}
          >
            {children}
          </AbstraxionProvider>

  ```

## 0.1.0-alpha.5

### Minor Changes

- [#89](https://github.com/burnt-labs/xion.js/pull/89) [`874ef2b`](https://github.com/burnt-labs/xion.js/commit/874ef2b6e0096285beff6752c7e2dc1e1c276ba4) Thanks [@justinbarry](https://github.com/justinbarry)! - Return RPC to rpc.xion-testnet-1.burnt.com:443 to avoid proxy rate limiting

## 0.1.0-alpha.4

### Minor Changes

- [#85](https://github.com/burnt-labs/xion.js/pull/85) [`e60fb47`](https://github.com/burnt-labs/xion.js/commit/e60fb4714b8cdf90ad2cfbba5c77b8b78a11542b) Thanks [@justinbarry](https://github.com/justinbarry)! - Update to use a round robin rpc endpoint

## 0.0.1-alpha.3

### Patch Changes

- [#67](https://github.com/burnt-labs/xion.js/pull/67) [`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove exports from package.json in signers and constants package. Additionally, adjust build setting to output more predicable build output.

## 0.0.1-alpha.2

### Patch Changes

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix package.json `main` path

## 0.0.1-alpha.1

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - Release constants as a npm package

## 0.0.1-alpha.0

### Patch Changes

- Initial Release
