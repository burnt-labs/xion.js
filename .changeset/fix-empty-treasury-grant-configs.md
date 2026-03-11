---
"@burnt-labs/account-management": patch
---

Fix treasury queries failing for contracts with no grant configs. `DirectQueryTreasuryStrategy` now returns empty `grantConfigs` instead of throwing "Treasury config not found".
