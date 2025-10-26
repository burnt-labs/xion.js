/**
 * Composite Indexer Strategy
 * Tries multiple indexer strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 */

import type { IndexerStrategy, SmartAccountWithCodeId } from "../types/indexer";

/**
 * Composite Indexer Strategy
 * Tries multiple indexer strategies in order, returning the first successful result
 *
 * Example usage (with proper fallback chain):
 * ```typescript
 * const strategy = new CompositeIndexerStrategy(
 *   new NumiaIndexerStrategy(url, token),        // Try Numia indexer first (fast)
 *   new DirectChainIndexerStrategy({             // Fallback to direct chain query (slower but reliable)
 *     rpcUrl,
 *     checksum,
 *     creator,
 *     prefix,
 *   }),
 *   new EmptyIndexerStrategy(),                  // Final fallback: create new account
 * );
 * ```
 */
export class CompositeAccountStrategy implements IndexerStrategy {
  private readonly strategies: IndexerStrategy[];

  constructor(...strategies: IndexerStrategy[]) {
    if (strategies.length === 0) {
      throw new Error(
        "CompositeAccountStrategy requires at least one strategy",
      );
    }
    this.strategies = strategies;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]> {
    console.log(`[CompositeIndexerStrategy] Trying ${this.strategies.length} strategies for authenticator: ${loginAuthenticator.substring(0, 20)}...`);

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      const strategyName = strategy.constructor.name;

      try {
        console.log(`[CompositeIndexerStrategy] Attempting strategy ${i + 1}/${this.strategies.length}: ${strategyName}`);

        const result = await strategy.fetchSmartAccounts(loginAuthenticator);

        if (result && result.length > 0) {
          console.log(`[CompositeIndexerStrategy] ✅ Strategy ${strategyName} found ${result.length} account(s)`);
          return result;
        }

        console.log(`[CompositeIndexerStrategy] Strategy ${strategyName} returned empty, trying next...`);
      } catch (error) {
        console.warn(`[CompositeIndexerStrategy] Strategy ${strategyName} failed:`, error);
        // Continue to next strategy
      }
    }

    console.log(`[CompositeIndexerStrategy] All strategies returned empty - no existing accounts found`);
    return [];
  }
}
