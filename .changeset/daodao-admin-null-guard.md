---
"@burnt-labs/account-management": patch
---

fix(account-management): reject the DaoDao indexer's unindexed-treasury placeholder. The indexer returns `{ admin: null, grantConfigs: {}, … }` (not a 404) for any contract it hasn't indexed; `DaoDaoTreasuryStrategy.validateAllResponse` now rejects when `admin` is null/absent instead of accepting it as a successful empty config. In a racing `CompositeTreasuryStrategy` this lets `DirectQueryTreasuryStrategy` win, so an un-indexed treasury no longer silently degrades the connect screen to "Read access only".
