# abstraxion-dashboard

## 0.2.0-alpha.17

### Minor Changes

- [#112](https://github.com/burnt-labs/xion.js/pull/112) [`04f02b1`](https://github.com/burnt-labs/xion.js/commit/04f02b1dc2f689b318c642628f32bb22f536ec4e) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix window.keplr error on startup when keplr is not installed

- [#111](https://github.com/burnt-labs/xion.js/pull/111) [`97685ba`](https://github.com/burnt-labs/xion.js/commit/97685bab1c531937a817c53bc314b079fe60cde8) Thanks [@icfor](https://github.com/icfor)! - Allow extra messages in the fee grant

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Impl Ethereum authenticator and signer

### Patch Changes

- [#109](https://github.com/burnt-labs/xion.js/pull/109) [`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77) Thanks [@BurntVal](https://github.com/BurntVal)! - Move Keplr/Metamask signin buttons into an "advanced" dropdown panel.

- Updated dependencies [[`4594b46`](https://github.com/burnt-labs/xion.js/commit/4594b46fa3c668e02c5ccade8d3b7aae2e7c0d77), [`6ea5c28`](https://github.com/burnt-labs/xion.js/commit/6ea5c282a9cd4ca15068052a4b615cd902f6113d)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.36
  - @burnt-labs/signers@0.1.0-alpha.8
  - @burnt-labs/ui@0.1.0-alpha.7

## 0.2.0-alpha.16

### Minor Changes

- [#78](https://github.com/burnt-labs/xion.js/pull/78) [`6de3996`](https://github.com/burnt-labs/xion.js/commit/6de39966e4a308c740ab8e66eb00a4c1f2d479b4) Thanks [@BurntVal](https://github.com/BurntVal)! - introduce the ability to add a secp256k1 authenticator (via Keplr) and use it as a signer for transactions

- # [#107](https://github.com/burnt-labs/xion.js/pull/107) [`2c33c31`](https://github.com/burnt-labs/xion.js/commit/2c33c3136280558ec505b401911244310432ebd3) Thanks [@justinbarry](https://github.com/justinbarry)! -

# Staking Grants

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

## 0.2.0-alpha.15

### Patch Changes

- Updated dependencies [[`0236eea`](https://github.com/burnt-labs/xion.js/commit/0236eea22a4c5a9b0b9b413cac4a8b62038a4456)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.34

## 0.2.0-alpha.14

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

## 0.2.0-alpha.13

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

### Patch Changes

- Updated dependencies [[`9ff23cb`](https://github.com/burnt-labs/xion.js/commit/9ff23cb244c271fb7438f2caef2b18ce4fa0afb8)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.32
  - @burnt-labs/constants@0.1.0-alpha.6

## 0.2.0-alpha.12

### Minor Changes

- [#95](https://github.com/burnt-labs/xion.js/pull/95) [`e6f0696`](https://github.com/burnt-labs/xion.js/commit/e6f06961f7368447a18fbd76bf3500cab8a686a2) Thanks [@justinbarry](https://github.com/justinbarry)! - Allow setting of the dashboard RPC via NEXT_PUBLIC_RPC_URL env var

### Patch Changes

- Updated dependencies [[`415f15a`](https://github.com/burnt-labs/xion.js/commit/415f15a50a85b55271e8ecf220801f67c4b3f7d1)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.31

## 0.2.0-alpha.11

### Patch Changes

- Updated dependencies [[`a9a882a`](https://github.com/burnt-labs/xion.js/commit/a9a882a23ff3227591287e7dc28438f7644a7bfa)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.30

## 0.2.0-alpha.10

### Patch Changes

- Updated dependencies [[`874ef2b`](https://github.com/burnt-labs/xion.js/commit/874ef2b6e0096285beff6752c7e2dc1e1c276ba4)]:
  - @burnt-labs/constants@0.1.0-alpha.5
  - @burnt-labs/abstraxion@1.0.0-alpha.29

## 0.2.0-alpha.9

### Patch Changes

- Updated dependencies [[`e60fb47`](https://github.com/burnt-labs/xion.js/commit/e60fb4714b8cdf90ad2cfbba5c77b8b78a11542b), [`f46fa86`](https://github.com/burnt-labs/xion.js/commit/f46fa8672ccf38d66b9bde244eecef573ee86ded)]:
  - @burnt-labs/constants@0.1.0-alpha.4
  - @burnt-labs/abstraxion@1.0.0-alpha.28

## 0.2.0-alpha.8

### Minor Changes

- [#80](https://github.com/burnt-labs/xion.js/pull/80) [`00dbb89`](https://github.com/burnt-labs/xion.js/commit/00dbb89f13028ec5251c744b1130e82b86afb8d6) Thanks [@justinbarry](https://github.com/justinbarry)! - Add sentry.io error tracking

- [#83](https://github.com/burnt-labs/xion.js/pull/83) [`7dd82fe`](https://github.com/burnt-labs/xion.js/commit/7dd82fe902ca1d0f64f91a1dd185be965beb6331) Thanks [@justinbarry](https://github.com/justinbarry)! - Add ability for a DAPP to request a token budget alongside contract exec privileges

### Patch Changes

- [#77](https://github.com/burnt-labs/xion.js/pull/77) [`cc24142`](https://github.com/burnt-labs/xion.js/commit/cc24142ce8ea3f62c83f35b528c5739427208d25) Thanks [@justinbarry](https://github.com/justinbarry)! - Enable vercel analytics on dashboard

- [#81](https://github.com/burnt-labs/xion.js/pull/81) [`6afb4dd`](https://github.com/burnt-labs/xion.js/commit/6afb4dd96af14bae2bd0a06632b37613e69faafb) Thanks [@justinbarry](https://github.com/justinbarry)! - Add error tracking for chain errors

- [#75](https://github.com/burnt-labs/xion.js/pull/75) [`2da222b`](https://github.com/burnt-labs/xion.js/commit/2da222bd97540a0eb5aefb3efd2c93e1fafe3ce7) Thanks [@justinbarry](https://github.com/justinbarry)! - Remove passkey biometrics button, remove white avatar and update copy

- Updated dependencies [[`7dd82fe`](https://github.com/burnt-labs/xion.js/commit/7dd82fe902ca1d0f64f91a1dd185be965beb6331)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.27

## 0.2.0-alpha.7

### Patch Changes

- Updated dependencies [[`4a281fc`](https://github.com/burnt-labs/xion.js/commit/4a281fcfa7ead6cb91f935e853b0a1bf7b98dcc9)]:
  - @burnt-labs/constants@0.0.1-alpha.3
  - @burnt-labs/signers@0.1.0-alpha.5
  - @burnt-labs/abstraxion@1.0.0-alpha.26

## 0.2.0-alpha.6

### Minor Changes

- [#57](https://github.com/burnt-labs/xion.js/pull/57) [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Moved display logic to internal "useModal" hook. Consumers will need to change their strategy from a custom piece of state within their app to utilizing this new hook. The login flow will now be a single tab experience.

- [#57](https://github.com/burnt-labs/xion.js/pull/57) [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c) Thanks [@BurntNerve](https://github.com/BurntNerve)! - Added font files and small ui tweaks

### Patch Changes

- Updated dependencies [[`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c), [`5e0d06f`](https://github.com/burnt-labs/xion.js/commit/5e0d06fd329422c7e0c7bcf63cc5929a8617502c), [`39fabfe`](https://github.com/burnt-labs/xion.js/commit/39fabfe78b029e55aa417ec9751696d861a905b0)]:
  - @burnt-labs/abstraxion@1.0.0-alpha.25
  - @burnt-labs/ui@0.1.0-alpha.5

## 0.2.0-alpha.5

### Minor Changes

- [#61](https://github.com/burnt-labs/xion.js/pull/61) [`105279a`](https://github.com/burnt-labs/xion.js/commit/105279afb824940e744a4366be25b83fb8fb74e0) Thanks [@justinbarry](https://github.com/justinbarry)! - Fix vite issue with graz package deep imports

### Patch Changes

- Updated dependencies [[`105279a`](https://github.com/burnt-labs/xion.js/commit/105279afb824940e744a4366be25b83fb8fb74e0)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.24

## 0.2.0-alpha.4

### Patch Changes

- Updated dependencies [[`2257a1f`](https://github.com/burnt-labs/xion.js/commit/2257a1f5249a1efaa6f7d15522ee330981ae8952)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.23
  - @burnt-labs/signers@0.1.0-alpha.4

## 0.2.0-alpha.3

### Patch Changes

- Updated dependencies [[`6a6fdd2`](https://github.com/burnt-labs/xion.js/commit/6a6fdd253a1dc81873d271d2ac5e87100ef18ff1), [`dd8680f`](https://github.com/burnt-labs/xion.js/commit/dd8680f6bc18e15a531993be048e9db83d79b488)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.22
  - @burnt-labs/ui@0.1.0-alpha.4

## 0.2.0-alpha.2

### Minor Changes

- [#41](https://github.com/burnt-labs/xion.js/pull/41) [`a269cdf`](https://github.com/burnt-labs/xion.js/commit/a269cdf88722408e91b643d12ce4181ce26296f3) Thanks [@BurntVal](https://github.com/BurntVal)! - abstraxion dynamic url for grant creation on dashboard

- [#33](https://github.com/burnt-labs/xion.js/pull/33) [`e7e582b`](https://github.com/burnt-labs/xion.js/commit/e7e582be198bca6b3bd0cf42ad68d8f7428132cb) Thanks [@BurntVal](https://github.com/BurntVal)! - Wrap contract grant message inside a `ContractExecutionAuthorization` message

### Patch Changes

- Updated dependencies [[`a269cdf`](https://github.com/burnt-labs/xion.js/commit/a269cdf88722408e91b643d12ce4181ce26296f3), [`e7e582b`](https://github.com/burnt-labs/xion.js/commit/e7e582be198bca6b3bd0cf42ad68d8f7428132cb), [`56b9f87`](https://github.com/burnt-labs/xion.js/commit/56b9f87482a7210072eaa279960d1ff01ad5b4e0)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.21
  - @burnt-labs/tailwind-config@0.0.1-alpha.2
  - @burnt-labs/ui@0.0.1-alpha.3

## 0.2.0-alpha.1

### Minor Changes

- [#37](https://github.com/burnt-labs/xion.js/pull/37) [`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8) Thanks [@justinbarry](https://github.com/justinbarry)! - Change API endpoints to the 'live' infrastructure and the live stytch project id

### Patch Changes

- Updated dependencies [[`30b8913`](https://github.com/burnt-labs/xion.js/commit/30b891389890bb85486d2e5d1d49ca2c9a16f8b8)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.20
  - @burnt-labs/signers@0.1.0-alpha.3

## 0.1.1-alpha.0

### Patch Changes

- [#32](https://github.com/burnt-labs/xion.js/pull/32) [`f6e5618`](https://github.com/burnt-labs/xion.js/commit/f6e5618f36ff15e6f642efad209f88151b395b7a) Thanks [@justinbarry](https://github.com/justinbarry)! - Initial commit of dashbaord

- Updated dependencies [[`7f498ee`](https://github.com/burnt-labs/xion.js/commit/7f498ee6c58a897f0a6cda76ecb60b52dd495846), [`5a17b99`](https://github.com/burnt-labs/xion.js/commit/5a17b99b56e62535297bd2b5a1086df68ee82ee1)]:
  - @burnt-labs/abstraxion@0.1.0-alpha.19
