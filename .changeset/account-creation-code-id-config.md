---
"@burnt-labs/account-management": minor
---

Make the account-creation code id reachable from `accountCreationConfig`

`createEthWalletAccount` / `createSecp256k1Account` accept a trailing `codeId`,
but `connectAccount` never passed one and `AccountCreationConfig` had no field
for it — so "register at any chain-allow-listed code id" was surface no real
caller could reach. `AccountCreationConfig.codeId?: string` now plumbs through
to both creation calls.

It is deliberately a new field rather than a reuse of
`smartAccountContract.codeId`. That one describes an already-deployed contract
for account *discovery* (it is the Subquery indexer's code-id filter);
promoting it to a registration target would silently change where every
existing consumer registers, and because the AA API validates the allow-list
fail-closed, it would break signup for anyone whose discovery code id is not
registerable. Omitting `codeId` keeps today's behaviour exactly — the AA API
uses its own default.

When set, it must correspond to `smartAccountContract.checksum`, or the local
CREATE2 derivation will not match the one the API verifies and the request is
rejected with an explicit checksum-mismatch error.
