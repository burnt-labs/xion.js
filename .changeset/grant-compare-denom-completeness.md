---
"@burnt-labs/abstraxion-core": patch
---

Fix grant comparison correctness: `isLimitValid` now requires every expected denom to be present on-chain (a chain grant that omits a required denom is no longer treated as a match), and Stake `maxTokens` is compared by value instead of by reference (so matching stake grants are no longer flagged as a mismatch).
