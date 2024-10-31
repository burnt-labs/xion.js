---
"@burnt-labs/abstraxion": minor
"demo-app": minor
---

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

Bank Send Grants
===
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
