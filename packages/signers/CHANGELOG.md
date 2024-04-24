# @burnt-labs/signers

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
