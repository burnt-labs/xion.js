/**
 * Composite Indexer Strategy
 * Tries multiple indexer strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 */

import type { IndexerStrategy, SmartAccountWithCodeId } from "../../types/indexer";
import type { AuthenticatorType } from "../../authenticators/type-detection";

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
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];

      try {
        const result = await strategy.fetchSmartAccounts(loginAuthenticator, authenticatorType);

        if (result && result.length > 0) {
          return result;
        }
      } catch (error) {
        // Continue to next strategy on error
      }
    }

    return [];
  }
}
