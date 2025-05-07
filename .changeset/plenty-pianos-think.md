---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/abstraxion": minor
"@burnt-labs/constants": minor
---

- **RPC Configuration:**
  - Added caching to RPC config fetches, reducing redundant network requests.
- **Treasury Grant Data:**
  - Introduced caching and a new function to fetch treasury grant data directly from the indexer.
  - Unified and simplified the treasury grant config API with improved fallback mechanisms.
- **Refactoring:**
  - Replaced direct CosmWasmClient usage with a modular RPC client utility.
  - Cleaned up and reorganized imports for better code clarity.
