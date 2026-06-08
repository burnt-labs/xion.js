---
"@burnt-labs/abstraxion-core": major
---

fix(abstraxion-core): handle `IbcTransfer` in `compareChainGrantsToTreasuryGrants` so IBC-transfer authorizations are compared correctly instead of being treated as a mismatch and invalidating the session.
