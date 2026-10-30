/**
 * Account query strategies for finding existing smart accounts
 *
 * Strategy types:
 * - DaoDaoAccountStrategy: Queries the DaoDao indexer (fast, requires indexer)
 * - NumiaAccountStrategy: Deprecated; queries the Numia indexer API
 * - SubqueryAccountStrategy: Queries Subquery indexer API (fast, requires indexer)
 * - AAApiAccountStrategy: Queries the AA API (v1 JWT; v2 EthWallet/Secp256K1 verified on chain)
 * - RpcAccountStrategy: Deprecated adapter over AAApiAccountStrategy v2 (requires aaApiUrl)
 * - EmptyAccountStrategy: Returns empty (forces new account creation)
 * - CompositeAccountStrategy: Tries multiple strategies with fallback chain
 */

// Account query strategies
export * from "./strategies/account-daodao-strategy";
export * from "./strategies/account-numia-strategy";
export * from "./strategies/account-subquery-strategy";
export * from "./strategies/account-aa-api-strategy";
export * from "./strategies/account-rpc-strategy";
export * from "./strategies/account-empty-strategy";
export * from "./strategies/account-composite-strategy";

// Factory function for creating composite strategies
export * from "./strategies/factory";

// Indexer config conversion utilities
export * from "./strategies/indexerConfigUtils";
