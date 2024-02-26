# demo-app

## 1.1.0-alpha.20

### Minor Changes

- # [#107](https://github.com/burnt-labs/xion.js/pull/107) [`2c33c31`](https://github.com/burnt-labs/xion.js/commit/2c33c3136280558ec505b401911244310432ebd3) Thanks [@justinbarry](https://github.com/justinbarry)! -

Staking Grants
===

  Add the ability for dapps to request staking grants be give via the dashboard. To request a grant, the dapp will need to set the `stake` prop to `true` in the config of the `abstraxion` provider.

  ```jsx
  <AbstraxionProvider
    config={{
      stake: true,
    }}
  >
    {children}
  </AbstraxionProvider>
  ```

  This will grant `StakeAuthorization` to delegate, undelegate, redelegate and a GenericAuthorization to exec a MsgWithdrawDelegatorReward msg along with a feegrant for these message to cover the fees.

  # Bank Send Grants

  Add the ability for dapps to request bank send grants be give via the dashboard. To request a grant, the dapp will need to set pass the requested `denom` and `amount` to the config of the `abstraxion` provider.

  ```jsx
  <AbstraxionProvider
    config={{
      bank: [
        {
          denom: "uxion",
          amount: "1000000",
        },
      ],
    }}
  >
    {children}
  </AbstraxionProvider>
  ```

### Patch Changes

- Updated dependencies [[`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4), [`2c33c31`](https://github.com/burnt-labs/xion.js/commit/2c33c3136280558ec505b401911244310432ebd3)]:
  - @burnt-labs/signers@0.1.0-alpha.7
  - @burnt-labs/ui@0.1.0-alpha.6
  - @burnt-labs/abstraxion@1.0.0-alpha.35

## 1.1.0-alpha.19

### Patch Changes

- Updated dependencies [[`0236eea`](https://github.com/burnt-labs/xion.js/commit/0236eea22a4c5a9b0b9b413cac4a8b62038a4456)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.34

## 1.1.0-alpha.18

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
  - @burnt-labs/abstraxion@1.0.0-alpha.33
  - @burnt-labs/signers@0.1.0-alpha.6

## 1.1.0-alpha.17

### Patch Changes

- [#97](https://github.com/burnt-labs/xion.js/pull/97) [`7bf0fa8`](https://github.com/burnt-labs/xion.js/commit/7bf0fa87726b9f5a695fd96a1b6b81361d420d0d) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix Next.js build issue with layout exporting constants

- Updated dependencies [[`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.32

## 1.1.0-alpha.16

### Patch Changes

- Updated dependencies [[`415f15a`](https://github.com/burnt-labs/xion.js/commit/415f15a50a85b55271e8ecf220801f67c4b3f7d1)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.31

## 1.1.0-alpha.15

### Patch Changes

- Updated dependencies [[`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.30

## 1.1.0-alpha.14

### Patch Changes

- Updated dependencies []:
  - @burnt-labs/abstraxion@1.0.0-alpha.29

## 1.1.0-alpha.13

### Patch Changes

- Updated dependencies [[`f46fa86`](https://github.com/burnt-labs/xion.js/commit/f46fa8672ccf38d66b9bde244eecef573ee86ded)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.28

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
