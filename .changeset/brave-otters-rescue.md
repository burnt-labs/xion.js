---
"@burnt-labs/account-management": patch
---

`urlsMatch` now compares the full URL origin (protocol + host + port) instead of only protocol + host. URLs that differ only by port (e.g. `https://example.com:443` vs `https://example.com:8443`) are no longer treated as matching, and unparseable inputs compare as non-matching. Schemes without a tuple origin (`data:`, `file:`, `mailto:`, …) stringify their origin as the literal `"null"` and are now rejected too, so two opaque-origin URLs no longer match each other.
