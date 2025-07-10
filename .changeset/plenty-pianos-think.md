---
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/abstraxion": minor
"@burnt-labs/abstraxion-react-native": minor
"@burnt-labs/constants": minor
---

- **RPC Configuration:**
  - Added caching with 5-minute TTL to RPC config fetches, reducing redundant network requests
  - Added `clearConfigCache()` function for manual cache invalidation
- **Treasury Grant Data:**
  - Introduced caching with 10-minute TTL for treasury data fetches
  - Added new function to fetch treasury grant data directly from the DaoDao indexer
  - Indexer URL is now configurable via `indexerUrl` parameter in provider configuration
  - Unified and simplified the treasury grant config API with improved fallback mechanisms
  - Added response validation for indexer data with proper type checking
  - Added `clearTreasuryCache()` function for manual cache invalidation
- **Error Handling:**
  - Added specific error types: `TreasuryError`, `IndexerError`, `IndexerNetworkError`, `IndexerResponseError`, `TreasuryConfigError`, and `TreasuryValidationError`
  - Improved error logging with contextual information (status codes, URLs)
- **Authentication:**
  - Fixed race condition in authentication with proper Promise-based queueing
  - Multiple concurrent authentication attempts now properly wait for the first to complete
- **Refactoring:**
  - Replaced direct CosmWasmClient usage with a modular RPC client utility to eliminate RPC `status` calls on startup
  - Simplified deprecated functions to delegate to the new unified `getTreasuryGrantConfigs` function
  - Cleaned up and reorganized imports for better code clarity
