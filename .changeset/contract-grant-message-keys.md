---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/account-management": minor
"@burnt-labs/abstraxion-js": minor
---

Contract grants can name the execute messages a session key may send and its call budget:

```ts
contracts: [
  {
    address: vaultAddress,
    amounts: [],
    acceptedMessageKeys: ["admit_private", "cancel_pending_admission"],
    maxCalls: 50,
  },
];
```

- `ContractGrantDescription` (object form) gains optional `acceptedMessageKeys` and `maxCalls`. `@burnt-labs/abstraxion-js` now re-exports the core type instead of its own copy, and `GrantConfig.contracts` in `@burnt-labs/account-management` uses it.
- `generateContractGrant` / `buildGrantMessages`: `acceptedMessageKeys` encodes an `AcceptedMessageKeysFilter`; `maxCalls` sets the call budget (default 255). With either set, `amounts: []` encodes `MaxCallsLimit` (no funds can be attached) and nonempty amounts encode `CombinedLimit`. Such an entry must be the only one for its address (compared case-insensitively), because wasmd tries every entry for a contract. Keys must be a nonempty list of unique, nonempty, trimmed strings and `maxCalls` a positive integer; otherwise it throws. Object descriptions with fields other than `address`, `amounts`, `acceptedMessageKeys` and `maxCalls` now throw instead of having the field dropped. Strings and `{ address, amounts }` objects encode exactly as before.
- `fetchChainGrantsABCI` now returns `ContractExecutionAuthorization` grants in REST form (`grants[].contract`, `limit`, `filter`), keeping `value`. Before, it returned only `{ "@type", value }`, and `compareContractGrants` threw on it.
- `compareContractGrants`: a description with `acceptedMessageKeys` or `maxCalls` is satisfied only by exactly one chain entry for that contract with the same key set, a call budget above zero and at most the requested one, `MaxCallsLimit` when `amounts` is empty, or `CombinedLimit` within `amounts` otherwise. An `AllowAllMessagesFilter` grant or one with extra keys no longer counts as a match.
