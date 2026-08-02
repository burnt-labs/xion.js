---
"@burnt-labs/abstraxion-core": minor
---

Add `createJWTAccount`, and let account lookups target a non-default code id

The JWT path — the dominant login path — had no high-level creation function:
callers used the raw `createJWTAccountV2` and so could not reach `code_id`, the
derivation claims, or the failure diagnostics that the ethwallet and secp256k1
paths already had. `createJWTAccount` closes that gap. It decodes `aud`/`sub`
from the session JWT, derives the CREATE2 address from `SHA256("<aud>.<sub>")`
— the identifier the AA API derives from, not the rotating token — and returns
`derived_address` alongside what was registered.

The derivation claims (`checksum`, `expected_address`) are **opt-in** on this
path, sent only when the caller passes a `derivation` config. The asymmetry is
deliberate: ethwallet/secp256k1 sign the derived address, so a derivation drift
is already fatal there and claiming it only turns an opaque "Invalid signature"
into a named error. JWT signs nothing — the token is the credential — so the
same drift is currently harmless, and sending the claims unconditionally would
convert working signups into hard 400s the moment a client's checksum went
stale. `code_id` is forwarded whenever given, with or without `derivation`.

Failure diagnostics run for JWT too, minus the address probe: that endpoint
takes its identifier in the URL *path*, and a JWT there would be logged by
every CDN and proxy in front of the API. The probe is refused inside
`diagnoseCreateFailure` by authenticator type rather than left to each call
site, and the resulting diagnosis says so. The registration-config probe
carries nothing user-specific and still runs, so a disallowed `code_id` is
still named.

`checkAccountOnChain` also gains an optional trailing `codeId`, mirroring
`getAccountAddress`. Without it an account registered at a non-default code id
could not be discovered at that code id, since the check derives its candidate
address from the resolved code id's checksum.

New exports: `createJWTAccount`, `CreateJWTAccountOptions`,
`CreateJWTAccountResult`, `JWTDerivationConfig`.
