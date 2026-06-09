---
"@burnt-labs/abstraxion-js": major
---

feat(abstraxion-js): extract `createAbstraxionRuntime` — a framework-agnostic runtime (subscribe/login/logout/manageAuthenticators + `createReadClient`/`createDirectSigningClient`) that React, React Native, and the Svelte/vanilla demos all consume, removing duplicated controller-narrowing logic. Adds React Native embedded (WebView iframe) transport strategies and unifies the hook surface.
