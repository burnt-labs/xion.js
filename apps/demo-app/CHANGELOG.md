# demo-app

## 1.1.0-alpha.12

### Minor Changes

- [#83](https://github.com/burnt-labs/xion.js/pull/83) [`7dd82fe`](https://github.com/burnt-labs/xion.js/commit/7dd82fe902ca1d0f64f91a1dd185be965beb6331) Thanks [@justinbarry](https://github.com/justinbarry)! - Add ability for a DAPP to request a token budget alongside contract exec privileges

### Patch Changes

- Updated dependencies [[`7dd82fe`](https://github.com/burnt-labs/xion.js/commit/7dd82fe902ca1d0f64f91a1dd185be965beb6331)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.27

## 1.1.0-alpha.11

### Patch Changes

- Updated dependencies [[`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9)]:
  - @burnt-labs/signers@0.1.0-alpha.5
  - @burnt-labs/abstraxion@1.0.0-alpha.26

## 1.1.0-alpha.10

### Minor Changes

- [#57](https://github.com/burnt-labs/xion.js/pull/57) [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Moved display logic to internal "useModal" hook. Consumers will need to change their strategy from a custom piece of state within their app to utilizing this new hook. The login flow will now be a single tab experience.

- [#65](https://github.com/burnt-labs/xion.js/pull/65) [`39fabfe`](https://github.com/burnt-labs/xion.js/commit/39fabfe78b029e55aa417ec9751696d861a905b0) Thanks [@justinbarry](https://github.com/justinbarry)! - Now longer use a blanket export in package.json as it was causing some confusion for some bundlers. There is no longer a css alias for "@burnt-labs/abstraxion/style.css", dapps will need to `import "@burnt-labs/abstraxion/dist/index.css"` going forward.

### Patch Changes

- Updated dependencies [[`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c), [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c), [`39fabfe`](https://github.com/burnt-labs/xion.js/commit/39fabfe78b029e55aa417ec9751696d861a905b0)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.25
  - @burnt-labs/ui@0.1.0-alpha.5

## 1.1.0-alpha.9

### Patch Changes

- Updated dependencies [[`105279a`](https://github.com/burnt-labs/xion.js/commit/105279afb824940e744a4366be25b83fb8fb74e0)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.24

## 1.1.0-alpha.8

### Patch Changes

- Updated dependencies [[`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.23
  - @burnt-labs/signers@0.1.0-alpha.4

## 1.1.0-alpha.7

### Patch Changes

- Updated dependencies [[`6a6fdd2`](https://github.com/burnt-labs/xion.js/commit/6a6fdd253a1dc81873d271d2ac5e87100ef18ff1), [`dd8680f`](https://github.com/burnt-labs/xion.js/commit/dd8680f6bc18e15a531993be048e9db83d79b488)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.22
  - @burnt-labs/ui@0.1.0-alpha.4

## 1.1.0-alpha.6

### Minor Changes

- [#41](https://github.com/burnt-labs/xion.js/pull/41) [`a269cdf`](https://github.com/burnt-labs/xion.js/commit/a269cdf88722408e91b643d12ce4181ce26296f3) Thanks [@BurntVal](https://github.com/BurntVal)! - abstraxion dynamic url for grant creation on dashboard

### Patch Changes

- Updated dependencies [[`a269cdf`](https://github.com/burnt-labs/xion.js/commit/a269cdf88722408e91b643d12ce4181ce26296f3), [`e7e582b`](https://github.com/burnt-labs/xion.js/commit/e7e582be198bca6b3bd0cf42ad68d8f7428132cb), [`56b9f87`](https://github.com/burnt-labs/xion.js/commit/56b9f87482a7210072eaa279960d1ff01ad5b4e0)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.21
  - @burnt-labs/ui@0.0.1-alpha.3

## 1.0.1-alpha.5

### Patch Changes

- Updated dependencies [[`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.20
  - @burnt-labs/signers@0.1.0-alpha.3

## 1.0.1-alpha.4

### Patch Changes

- Updated dependencies [[`7f498ee`](https://github.com/burnt-labs/xion.js/commit/7f498ee6c58a897f0a6cda76ecb60b52dd495846), [`5a17b99`](https://github.com/burnt-labs/xion.js/commit/5a17b99b56e62535297bd2b5a1086df68ee82ee1)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.19

## 1.0.1-alpha.3

### Patch Changes

- Updated dependencies [[`bda24ea`](https://github.com/burnt-labs/xion.js/commit/bda24ea57cd76814f59714aa9b4561e95635e947), [`4f0fe61`](https://github.com/burnt-labs/xion.js/commit/4f0fe6140299a2a0aa242c3f1b22c26b327ea926)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.18
  - @burnt-labs/signers@0.0.1-alpha.2
  - @burnt-labs/ui@0.0.1-alpha.2

## 1.0.1-alpha.2

### Patch Changes

- [#23](https://github.com/burnt-labs/xion.js/pull/23) [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c) Thanks [@justinbarry](https://github.com/justinbarry)! - The eslint config file extend property was changed to point to "@burnt-labs/eslint-config-custom/next" or "@burnt-labs/eslint-config-custom/react" appropriately and `root` property was set to true.

- Updated dependencies [[`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c), [`6d0da14`](https://github.com/burnt-labs/xion.js/commit/6d0da14174aec36f7901d92b1756b06bdcc76c6c)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.17
  - @burnt-labs/signers@0.0.1-alpha.1
  - @burnt-labs/ui@0.0.1-alpha.1

## 1.0.1-alpha.1

### Patch Changes

- Updated dependencies [8c57207]
  - @burnt-labs/abstraxion@0.1.0-alpha.16

## 1.0.1-alpha.0

### Patch Changes

- Initial Release
- Updated dependencies
  - @burnt-labs/abstraxion@0.0.1-alpha.15
  - @burnt-labs/signers@0.0.1-alpha.0
  - @burnt-labs/ui@0.0.1-alpha.0
