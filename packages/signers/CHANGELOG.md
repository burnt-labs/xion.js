# @burnt-labs/signers [DEPRECATED]

## 0.1.0-alpha.14

### Minor Changes

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`d390f1e`](https://github.com/burnt-labs/xion.js/commit/d390f1e4df207cde79056b7919965b0f2e473f3d) Thanks [@burnt-sun](https://github.com/burnt-sun)! - chore: apply prettier formatting

- [#279](https://github.com/burnt-labs/xion.js/pull/279) [`5572077`](https://github.com/burnt-labs/xion.js/commit/557207735cece8a6050e9fb4aff4b398e3467cdb) Thanks [@burnt-sun](https://github.com/burnt-sun)! - Chore: apply prettier formatting.

> ⚠️ **DEPRECATED**: This package is deprecated as of [CURRENT DATE] and will no longer receive updates or maintenance.

## 0.1.0-alpha.14

### Major Changes

- Package deprecated. This package will no longer receive updates or maintenance. Please contact the Burnt Labs team for migration guidance and alternative solutions.

## 0.1.0-alpha.13

### Minor Changes

- [#219](https://github.com/burnt-labs/xion.js/pull/219) [`076b30b`](https://github.com/burnt-labs/xion.js/commit/076b30b64fc373384b3f9ff4c5e99646a06487d7) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade cosmjs dependencies to fix raw log parsing error

- [#216](https://github.com/burnt-labs/xion.js/pull/216) [`4e84d2b`](https://github.com/burnt-labs/xion.js/commit/4e84d2b8c24a80b81dd79a2b3993df9249b88069) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix under simulation

## 0.1.0-alpha.12

### Minor Changes

- [#208](https://github.com/burnt-labs/xion.js/pull/208) [`d5780ce`](https://github.com/burnt-labs/xion.js/commit/d5780ce742bba6a6cd7e1a872e4693f0dd078267) Thanks [@BurntVal](https://github.com/BurntVal)! - Introduce gas simulation for AA transactions

- [#214](https://github.com/burnt-labs/xion.js/pull/214) [`78cf088`](https://github.com/burnt-labs/xion.js/commit/78cf0886ccc1a4c023642c4a7d87f9196d637940) Thanks [@BurntVal](https://github.com/BurntVal)! - Fix gas calculation param bug

### Patch Changes

- [#205](https://github.com/burnt-labs/xion.js/pull/205) [`3f3aa37`](https://github.com/burnt-labs/xion.js/commit/3f3aa37f2e98fa8fb1abd0e3a4ad2b271ca1587a) Thanks [@justinbarry](https://github.com/justinbarry)! - Ship unminified code to help with downstream debugging

## 0.1.0-alpha.11

### Minor Changes

- [#183](https://github.com/burnt-labs/xion.js/pull/183) [`750803b`](https://github.com/burnt-labs/xion.js/commit/750803b1a4235334322262d1e932f81d3ea13060) Thanks [@BurntVal](https://github.com/BurntVal)! - General cleanup and build optimization

- [#178](https://github.com/burnt-labs/xion.js/pull/178) [`a0b5031`](https://github.com/burnt-labs/xion.js/commit/a0b5031f8766369b00562387b692450f396a9d7f) Thanks [@BurntVal](https://github.com/BurntVal)! - Implement ability to remove authenticators

## 0.1.0-alpha.10

### Minor Changes

- [#147](https://github.com/burnt-labs/xion.js/pull/147) [`bed091d`](https://github.com/burnt-labs/xion.js/commit/bed091d74557457efb681734a27b46d97cdefbbe) Thanks [@BurntVal](https://github.com/BurntVal)! - Implementation of OKX wallet (cosmos provider)

## 0.1.0-alpha.9

### Patch Changes

- [#117](https://github.com/burnt-labs/xion.js/pull/117) [`6978612`](https://github.com/burnt-labs/xion.js/commit/697861259eff1199d143f79c7d8c0666eec4760b) Thanks [@BurntVal](https://github.com/BurntVal)! - Add configurability to allow for mainnet/testnet deployments

  For devs utilizing the `buildAddJWTAuthenticatorMsg` found in the @burnt-labs/signers package, please note that you will now need to pass in an aud string. Contact the team for details.

## 0.1.0-alpha.8

### Minor Changes

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Impl Ethereum authenticator and signer

## 0.1.0-alpha.7

### Minor Changes

- [#78](https://github.com/burnt-labs/xion.js/pull/78) [`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4) Thanks [@BurntVal](https://github.com/BurntVal)! - introduce the ability to add a secp256k1 authenticator (via Keplr) and use it as a signer for transactions

## 0.1.0-alpha.6

### Minor Changes

- [#94](https://github.com/burnt-labs/xion.js/pull/94) [`c695fbf`](https://github.com/burnt-labs/xion.js/commit/c695fbfa636dd149a2f7305cd87298c6cc84d67e) Thanks [@justinbarry](https://github.com/justinbarry)! - Update the following packages to the latest version:

  | Package                   | Version |
  | ------------------------- | ------- |
  | @cosmjs/cosmwasm-stargate | ^0.32.2 |
  | @cosmjs/proto-signing     | ^0.32.2 |
  | @cosmjs/stargate          | ^0.32.2 |
  | @cosmjs/tendermint-rpc    | ^0.32.2 |
  | cosmjs-types              | ^0.9.0  |

## 0.1.0-alpha.5

### Patch Changes

- [#67](https://github.com/burnt-labs/xion.js/pull/67) [`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove exports from package.json in signers and constants package. Additionally, adjust build setting to output more predicable build output.

## 0.1.0-alpha.4

### Minor Changes

- [#53](https://github.com/burnt-labs/xion.js/pull/53) [`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952) Thanks [@justinbarry](https://github.com/justinbarry)! - Add getAccount method in GranteeSignerClient to parse abstractaccount.v1.AbstractAccount type accounts

## 0.1.0-alpha.3

### Minor Changes

- [#37](https://github.com/burnt-labs/xion.js/pull/37) [`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8) Thanks [@justinbarry](https://github.com/justinbarry)! - Change API endpoints to the 'live' infrastructure and the live stytch project id

## 0.0.1-alpha.2

### Patch Changes

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix package.json `main` path

## 0.0.1-alpha.1

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - 1include both CommonJS and ESM formats in the release setup. Additionally, minification was disabled for these packages.

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - Upgrade typescript dependency

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - The eslint config file extend property was changed to point to "@burnt-labs/eslint-config-custom/next" or "@burnt-labs/eslint-config-custom/react" appropriately and `root` property was set to true.

## 0.0.1-alpha.0

### Patch Changes

- Initial Release
