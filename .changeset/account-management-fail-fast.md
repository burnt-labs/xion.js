---
"@burnt-labs/account-management": major
---

feat(account-management): fail-fast guards for `CompositeAccountStrategy` and `accountConnection` — surface configuration/strategy errors immediately instead of silently degrading, fixing latent strategy bugs uncovered while migrating the integration tests to `@burnt-labs/abstraxion-js`.
