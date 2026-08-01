---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/signers": minor
---

Derive the account-creation address locally, and let the AA API name derivation drift

`createEthWalletAccount` / `createSecp256k1Account` previously fetched the
address to sign from the AA API before every creation, treating the API as
authoritative and falling back to the local CREATE2 derivation only when the
endpoint was unreachable. That cost a round-trip on every account creation and
meant the client signed a value the network handed it.

Creation now derives the address locally (CREATE2, no pre-flight request) and
signs only that. Three things replace what the pre-flight bought:

1. **Up-front, on the API.** Creation requests now carry the client's
   `checksum` and `expected_address`. The AA API compares both against its own
   chain-resolved derivation and rejects a mismatch with a 400 naming the
   drifted input — instead of the opaque "Invalid signature" that a stale
   checksum used to produce. Both fields are optional server-side, so an older
   API simply ignores them.
2. **After a failure.** `diagnoseCreateFailure` probes
   `GET /account/address/...` and `GET /account/registration-config`
   concurrently and throws an `AccountCreationError` carrying `signedAddress`,
   `apiAddress`, `registrationConfig`, the original error as `cause`, and a
   ranked diagnosis (disallowed `code_id` → address divergence → derivation
   agrees so the failure is downstream → probes unreachable).
3. **After success.** The registered address is cross-checked against the
   derived one. Both are returned: creation now resolves to
   `CreateAccountResult` (`CreateAccountResponse` plus `derived_address`), so
   callers can assert alignment without re-deriving. A divergence warns rather
   than throws — the AA API legitimately returns a pre-existing account
   registered under an older code id.

A requested `codeId` is passed through verbatim; the AA API validates it
against the chain's `allowed_code_ids` fail-closed, so callers do not pre-check
it. Note that a requested `codeId` must correspond to the `checksum` passed to
the same call, or the local derivation will not match what the API verifies —
which the checks above now report explicitly.

`@burnt-labs/signers` regains the generated AA API types for the new surface:
`checksum` / `expected_address` on the create requests, `code_id` on the
create/address endpoints, and the new `RegistrationConfigResponse`.

New exports: `AccountCreationError`, `diagnoseCreateFailure`,
`checkAddressAlignment`, `getRegistrationConfig`, `CreateAccountResult`,
`RegistrationConfigResponse`.
