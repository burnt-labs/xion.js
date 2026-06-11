---
"@burnt-labs/abstraxion-core": minor
---

feat(abstraxion-core): add framework-agnostic simulate robustness helpers — `classifySimulateError` / `diagnoseSimulateError` / `classifyGrantError`, the `SIMULATE_RETRY_COUNT` / `SIMULATE_RETRY_DELAY_MS` / `SIMULATE_FALLBACK_GAS` constants, and a generic `simulateWithRetry` (classification + bounded retry + concrete-fee fallback) that composes with any cosmjs-shaped `{ simulate(...) }` client. The logger is injectable (defaults to `console.warn`) and the context label is a plain string, so non-dashboard callers (`RequireSigningClient`, `GranteeSignerClient`, `AAClient`, plain cosmjs) can reuse it without dashboard-specific coupling.
