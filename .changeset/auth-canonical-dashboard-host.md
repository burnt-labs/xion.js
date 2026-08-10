---
"@burnt-labs/constants": minor
---

Mainnet dashboard and iframe URLs now resolve to `auth.burnt.com`, replacing `settings.burnt.com`. Testnet dashboard and iframe URLs resolve to `auth.testnet.burnt.com`.

`settings.burnt.com` continues to serve the dashboard on its own origin. It is **not** redirected to `auth.burnt.com`, and must not be: released clients validate popup and iframe `postMessage` traffic against the origin they were configured with, so a cross-origin redirect would change `event.origin` and cause those messages to be dropped. Releases pinned to the old value keep working because the old host keeps serving, not because traffic is forwarded.

Read the URL from `@burnt-labs/constants` rather than hardcoding either host.
