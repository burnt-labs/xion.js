/**
 * Account query strategies for finding existing smart accounts
 *
 * Strategy types:
 * - NumiaAccountStrategy: Queries Numia indexer API (fast, requires indexer)
 * - SubqueryAccountStrategy: Queries Subquery indexer API (fast, requires indexer)
 * - RpcAccountStrategy: Queries chain directly via RPC (slower, only needs RPC)
 * - EmptyAccountStrategy: Returns empty (forces new account creation)
 * - CompositeAccountStrategy: Tries multiple strategies with fallback chain
 */

// Account query strategies
export * from "./strategies/account-numia-strategy";
export * from "./strategies/account-subquery-strategy";
export * from "./strategies/account-rpc-strategy";
export * from "./strategies/account-empty-strategy";
export * from "./strategies/account-composite-strategy";

// Factory function for creating composite strategies
export * from "./strategies/factory";

// Indexer config conversion utilities
export * from "./strategies/indexerConfigUtils";
