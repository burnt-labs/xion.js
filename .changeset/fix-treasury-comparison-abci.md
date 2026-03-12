---
"@burnt-labs/abstraxion-core": patch
---

Fix treasury grant comparison failing after ABCI migration. `fetchChainGrantsABCI` now preserves raw protobuf `typeUrl`/`value` alongside decoded REST format so `compareGrantsToTreasuryWithConfigs` can re-decode chain grants correctly. Previously all chain grants were decoded as "Unsupported", causing treasury users to be logged out immediately after login.
