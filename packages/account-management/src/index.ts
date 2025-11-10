/**
 * @burnt-labs/account-management
 *
 * Smart account management utilities for XION blockchain
 *
 * This package provides utilities for:
 * - Finding existing smart accounts (accounts/)
 * - Managing authenticators (add, remove, validate)
 * - Building grant messages (grants/)
 * - Querying treasury contracts (grants/strategies/)
 * - Connection orchestration (orchestrator/)
 */

// Authenticator utilities
export * from "./authenticators";

// Grant utilities (includes treasury strategies)
export * from "./grants";

// Account discovery utilities
export * from "./accounts/discovery";

// Account query strategies
export * from "./accounts";

// Connection orchestrator
export * from "./orchestrator";

// State machine (shared between React packages)
export * from "./state/accountState";

// Types
export * from "./types";
