# @burnt-labs/abstraxion

## 1.0.0-alpha.30

### Minor Changes

- [#92](https://github.com/burnt-labs/xion.js/pull/92) [`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa) Thanks [@Peartes](https://github.com/Peartes)! - Pull GranteeSignerClient into a separate "core" package to help others reproduce abstraxion functionality

### Patch Changes

- Updated dependencies [[`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa)]:
  - @burnt-labs/abstraxion-core@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- Updated dependencies [[`874ef2b`](https://github.com/burnt-labs/xion.js/commit/874ef2b6e0096285beff6752c7e2dc1e1c276ba4)]:
  - @burnt-labs/constants@0.1.0-alpha.5

## 1.0.0-alpha.28

### Minor Changes

- [#87](https://github.com/burnt-labs/xion.js/pull/87) [`f46fa86`](https://github.com/burnt-labs/xion.js/commit/f46fa8672ccf38d66b9bde244eecef573ee86ded) Thanks [@justinbarry](https://github.com/justinbarry)! - Allow for dapp to pass in custom rpc url

### Patch Changes

- Updated dependencies [[`e60fb47`](https://github.com/burnt-labs/xion.js/commit/e60fb4714b8cdf90ad2cfbba5c77b8b78a11542b)]:
  - @burnt-labs/constants@0.1.0-alpha.4

## 1.0.0-alpha.27

### Minor Changes

- [#83](https://github.com/burnt-labs/xion.js/pull/83) [`7dd82fe`](https://github.com/burnt-labs/xion.js/commit/7dd82fe902ca1d0f64f91a1dd185be965beb6331) Thanks [@justinbarry](https://github.com/justinbarry)! - Add ability for a DAPP to request a token budget alongside contract exec privileges

## 1.0.0-alpha.26

### Patch Changes

- Updated dependencies [[`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9)]:
  - @burnt-labs/constants@0.0.1-alpha.3
  - @burnt-labs/signers@0.1.0-alpha.5

## 1.0.0-alpha.25

### Major Changes

- [#57](https://github.com/burnt-labs/xion.js/pull/57) [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Moved display logic to internal "useModal" hook. Consumers will need to change their strategy from a custom piece of state within their app to utilizing this new hook. The login flow will now be a single tab experience.

### Minor Changes

- [#65](https://github.com/burnt-labs/xion.js/pull/65) [`39fabfe`](https://github.com/burnt-labs/xion.js/commit/39fabfe78b029e55aa417ec9751696d861a905b0) Thanks [@justinbarry](https://github.com/justinbarry)! - Now longer use a blanket export in package.json as it was causing some confusion for some bundlers. There is no longer a css alias for "@burnt-labs/abstraxion/style.css", dapps will need to `import "@burnt-labs/abstraxion/dist/index.css"` going forward.

### Patch Changes

- Updated dependencies [[`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c), [`39fabfe`](https://github.com/burnt-labs/xion.js/commit/39fabfe78b029e55aa417ec9751696d861a905b0)]:
  - @burnt-labs/ui@0.1.0-alpha.5

## 0.1.0-alpha.24

### Minor Changes

- [#61](https://github.com/burnt-labs/xion.js/pull/61) [`105279a`](https://github.com/burnt-labs/xion.js/commit/105279afb824940e744a4366be25b83fb8fb74e0) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix vite issue with graz package deep imports

## 0.1.0-alpha.23

### Minor Changes

- [#53](https://github.com/burnt-labs/xion.js/pull/53) [`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952) Thanks [@justinbarry](https://github.com/justinbarry)! - Add getAccount method in GranteeSignerClient to parse abstractaccount.v1.AbstractAccount type accounts

### Patch Changes

- Updated dependencies [[`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952)]:
  - @burnt-labs/signers@0.1.0-alpha.4

## 0.1.0-alpha.22

### Minor Changes

- [#42](https://github.com/burnt-labs/xion.js/pull/42) [`6a6fdd2`](https://github.com/burnt-labs/xion.js/commit/6a6fdd253a1dc81873d271d2ac5e87100ef18ff1) Thanks [@BurntVal](https://github.com/BurntVal)! - remove unnecessary packages from abstraxion and optimize modal backdrop

- [#47](https://github.com/burnt-labs/xion.js/pull/47) [`dd8680f`](https://github.com/burnt-labs/xion.js/commit/dd8680f6bc18e15a531993be048e9db83d79b488) Thanks [@BurntVal](https://github.com/BurntVal)! - persistence and related state cleanup

### Patch Changes

- Updated dependencies [[`6a6fdd2`](https://github.com/burnt-labs/xion.js/commit/6a6fdd253a1dc81873d271d2ac5e87100ef18ff1)]:
  - @burnt-labs/ui@0.1.0-alpha.4

## 0.1.0-alpha.21

### Minor Changes

- [#41](https://github.com/burnt-labs/xion.js/pull/41) [`a269cdf`](https://github.com/burnt-labs/xion.js/commit/a269cdf88722408e91b643d12ce4181ce26296f3) Thanks [@BurntVal](https://github.com/BurntVal)! - abstraxion dynamic url for grant creation on dashboard

- [#44](https://github.com/burnt-labs/xion.js/pull/44) [`56b9f87`](https://github.com/burnt-labs/xion.js/commit/56b9f87482a7210072eaa279960d1ff01ad5b4e0) Thanks [@justinbarry](https://github.com/justinbarry)! - Add grantee signer client to seamlessly handle granter/grantee relationships

### Patch Changes

- [#33](https://github.com/burnt-labs/xion.js/pull/33) [`e7e582b`](https://github.com/burnt-labs/xion.js/commit/e7e582be198bca6b3bd0cf42ad68d8f7428132cb) Thanks [@BurntVal](https://github.com/BurntVal)! - Updated designs

- Updated dependencies [[`e7e582b`](https://github.com/burnt-labs/xion.js/commit/e7e582be198bca6b3bd0cf42ad68d8f7428132cb)]:
  - @burnt-labs/ui@0.0.1-alpha.3

## 0.1.0-alpha.20

### Minor Changes

- [#37](https://github.com/burnt-labs/xion.js/pull/37) [`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8) Thanks [@justinbarry](https://github.com/justinbarry)! - Change API endpoints to the 'live' infrastructure and the live stytch project id

### Patch Changes

- Updated dependencies [[`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8)]:
  - @burnt-labs/signers@0.1.0-alpha.3

## 0.1.0-alpha.19

### Minor Changes

- [#36](https://github.com/burnt-labs/xion.js/pull/36) [`5a17b99`](https://github.com/burnt-labs/xion.js/commit/5a17b99b56e62535297bd2b5a1086df68ee82ee1) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove webAuthn registration functionality

### Patch Changes

- [#36](https://github.com/burnt-labs/xion.js/pull/36) [`7f498ee`](https://github.com/burnt-labs/xion.js/commit/7f498ee6c58a897f0a6cda76ecb60b52dd495846) Thanks [@justinbarry](https://github.com/justinbarry)! - Simplify terms and conditions text

## 0.1.0-alpha.18

### Patch Changes

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`bda24ea`](https://github.com/burnt-labs/xion.js/commit/bda24ea57cd76814f59714aa9b4561e95635e947) Thanks [@justinbarry](https://github.com/justinbarry)! - Restore readme to the abstraxtion library

- [#26](https://github.com/burnt-labs/xion.js/pull/26) [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix package.json `main` path

- Updated dependencies [[`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926)]:
  - @burnt-labs/constants@0.0.1-alpha.2
  - @burnt-labs/signers@0.0.1-alpha.2
  - @burnt-labs/ui@0.0.1-alpha.2

## 0.1.0-alpha.17

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - 1include both CommonJS and ESM formats in the release setup. Additionally, minification was disabled for these packages.

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - Release constants as a npm package

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - The eslint config file extend property was changed to point to "@burnt-labs/eslint-config-custom/next" or "@burnt-labs/eslint-config-custom/react" appropriately and `root` property was set to true.

- Updated dependencies [[`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c)]:
  - @burnt-labs/signers@0.0.1-alpha.1
  - @burnt-labs/ui@0.0.1-alpha.1
  - @burnt-labs/constants@0.0.1-alpha.1

## 0.1.0-alpha.16

### Minor Changes

- 8c57207: Remove the advanced login options (Metamask and Keplr) from the AbstraxionSignin component. The showAdvanced state variable and related code have been deleted, simplifying the sign-in process for users.

## 0.0.1-alpha.15

### Patch Changes

- Initial Release
- Updated dependencies
  - @burnt-labs/signers@0.0.1-alpha.0
  - @burnt-labs/ui@0.0.1-alpha.0
