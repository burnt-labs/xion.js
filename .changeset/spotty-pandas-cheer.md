---
"@burnt-labs/abstraxion-core": patch
---

Account creation (`createSecp256k1Account`, `createEthWalletAccount`) now resolves the
address to sign from the AA API's `/api/v2/account/address/...` endpoint instead of
trusting only the client-side checksum/feeGranter derivation. The API is the service
that derives, verifies, and registers the account, so its answer is authoritative —
this eliminates the "Invalid signature" creation failures caused by client config
(code id / checksum) drifting out of sync with the deployed AA API. The local CREATE2
derivation is kept as a cross-check (a mismatch logs a stale-config warning) and as a
fallback when the address endpoint is unreachable.

Both functions (and `getAccountAddress`) also accept a new optional trailing
`codeId` parameter. When provided, it is forwarded to the AA API (`?code_id=` on the
address lookup, `code_id` in the create body), which validates it against the chain's
`x/abstractaccount` allowed_code_ids (fail-closed) and registers at that code —
enabling creation at any chain-allow-listed code id (e.g. an older one) instead of
only the worker's default. Existing call sites are unaffected.
