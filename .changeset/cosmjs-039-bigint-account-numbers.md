---
"@burnt-labs/signers": minor
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/account-management": minor
"@burnt-labs/abstraxion-js": minor
"@burnt-labs/abstraxion-react": patch
"@burnt-labs/abstraxion-react-native": patch
---

Move to CosmJS 0.39 and carry account numbers as `bigint`, for xion v32 (Cosmos SDK 0.55).

From v32 on, every new account (new smart accounts and the session keys created at login) gets an account number of at least 2^63. CosmJS 0.36 cannot decode those, so `getAccount`, `getSequence` and signing fail for them.

- `customAccountFromAny` returns `accountNumber` as a `bigint` for every account type, and `AAClient` and `GranteeSignerClient` sign with the exact number.
- `@cosmjs/cosmwasm-stargate` is replaced by `@cosmjs/cosmwasm` 0.39 (the old package stops at 0.38). `CosmWasmClient` re-exported from `@burnt-labs/abstraxion-js` now comes from `@cosmjs/cosmwasm`.
- Breaking for callers: `Account.accountNumber` and `SequenceResponse.accountNumber` are `bigint` (CosmJS 0.39). Do not convert them with `Number()`.
- `GranteeSignerClient` options keep taking a plain `GasPrice`.
- CosmJS 0.39.0's `fromBech32` throws with `@scure/base` 2.3.0 or later (cosmos/cosmjs#1982). Until CosmJS ships the fix, apps should pin it, e.g. pnpm `"@cosmjs/encoding>@scure/base": "~2.2.0"` or npm `"overrides": { "@cosmjs/encoding": { "@scure/base": "~2.2.0" } }`.
