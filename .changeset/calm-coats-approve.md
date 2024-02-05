---
"@burnt-labs/abstraxion": major
"abstraxion-dashboard": minor
"demo-app": minor
---

Moved display logic to internal "useModal" hook. Consumers will need to change their strategy from a custom piece of state within their app to utilizing this new hook. The login flow will now be a single tab experience.
