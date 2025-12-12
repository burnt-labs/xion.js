/**
 * @burnt-labs/test-utils
 *
 * Shared test utilities and helpers for xion.js packages.
 *
 * For package-specific mock data, use:
 * - @burnt-labs/signers/testing (authenticators, accounts)
 * - @burnt-labs/account-management/testing (treasury, grants)
 */

// Re-export shared utilities
export * from "./mocks/index.js";
export * from "./builders/index.js";
export * from "./helpers/index.js";
export * from "./vitest/index.js";
// Note: integration-helpers.ts removed to break circular dependency
// Use package-specific helpers instead (e.g., abstraxion/tests/integration/helpers.ts)
