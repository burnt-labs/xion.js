/**
 * Treasury strategies for querying treasury contract configurations
 *
 * Strategy types:
 * - DaoDaoTreasuryStrategy: Queries DaoDao indexer API (fast, requires indexer)
 * - DirectQueryTreasuryStrategy: Queries contract directly via RPC (slower, only needs RPC)
 * - CompositeTreasuryStrategy: Tries multiple strategies with fallback chain
 */

export * from "./treasury-daodao-strategy";
export * from "./treasury-direct-query-strategy";
export * from "./treasury-composite-strategy";

// Factory function for creating composite treasury strategies
export * from "./createCompositeTreasuryStrategy";
