/**
 * Account query strategies for finding existing smart accounts
 *
 * Strategy types:
 * - NumiaAccountStrategy: Queries Numia indexer API (fast, requires indexer)
 * - RpcAccountStrategy: Queries chain directly via RPC (slower, only needs RPC)
 * - EmptyAccountStrategy: Returns empty (forces new account creation)
 * - CompositeAccountStrategy: Tries multiple strategies with fallback chain
 */

// Account query strategies
export * from "./account-numia-strategy";
export * from "./account-rpc-strategy";
export * from "./account-empty-strategy";
export * from "./account-composite-strategy";

// Factory function for creating composite strategies
export * from "./createCompositeAccountStrategy";
