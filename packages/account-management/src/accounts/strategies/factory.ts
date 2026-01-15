/**
 * Factory function for creating a CompositeAccountStrategy with common fallback chain
 * Provides a convenient way to create a strategy without manually instantiating each one
 */

import { NumiaAccountStrategy } from "./account-numia-strategy";
import { SubqueryAccountStrategy } from "./account-subquery-strategy";
import { RpcAccountStrategy } from "./account-rpc-strategy";
import { AAApiAccountStrategy } from "./account-aa-api-strategy";
import { EmptyAccountStrategy } from "./account-empty-strategy";
import { CompositeAccountStrategy } from "./account-composite-strategy";
import type { RpcAccountStrategyConfig } from "./account-rpc-strategy";
import type { AAApiAccountStrategyConfig } from "./account-aa-api-strategy";
import type { AccountIndexerConfig } from "../../types/indexer";

export interface CreateCompositeAccountStrategyConfig {
  /**
   * Indexer configuration for fast account lookups
   * Supports both Numia and Subquery indexers
   *
   * For Numia: { type: 'numia', url: string, authToken?: string }
   * For Subquery: { type: 'subquery', url: string, codeId: number }
   *
   * If type is not specified, defaults to Numia for backward compatibility
   */
  indexer?: AccountIndexerConfig;

  /**
   * AA-API configuration for canonical account lookups
   * Provides reliable fallback when indexers are unavailable
   * Note: V1 API only supports JWT authenticators (aud.sub format)
   */
  aaApi?: AAApiAccountStrategyConfig;

  /**
   * RPC configuration for reliable on-chain account lookups
   * If provided, RpcAccountStrategy will be used as a fallback
   */
  rpc?: RpcAccountStrategyConfig;
}

/**
 * Creates a CompositeAccountStrategy with automatic fallback chain:
 * 1. Indexer strategy (Numia or Subquery, if configured) - Fast indexer queries
 * 2. AA-API strategy (if configured) - Canonical account state fallback
 * 3. RpcAccountStrategy (if RPC config provided) - Reliable on-chain queries
 * 4. EmptyAccountStrategy (always included) - Returns empty for new accounts
 *
 * Recommended fallback chain for production:
 * - Numia (fast, comprehensive)
 * - AA-API (canonical, reliable)
 * - RPC (on-chain verification)
 * - Empty (new account creation)
 *
 * @param config - Configuration for the strategies to include
 * @returns CompositeAccountStrategy with configured fallback chain
 *
 */
export function createCompositeAccountStrategy(
  config: CreateCompositeAccountStrategyConfig,
): CompositeAccountStrategy {
  const strategies = [];

  // Add indexer strategy if configured (fast)
  if (config.indexer) {
    const indexerType =
      "type" in config.indexer ? config.indexer.type : "numia";

    if (indexerType === "subquery") {
      // Subquery indexer
      const subqueryConfig = config.indexer as {
        type: "subquery";
        url: string;
        codeId: number;
      };
      strategies.push(
        new SubqueryAccountStrategy(subqueryConfig.url, subqueryConfig.codeId),
      );
    } else {
      // Numia indexer (default)
      const numiaConfig = config.indexer as {
        type?: "numia";
        url: string;
        authToken?: string;
      };
      strategies.push(
        new NumiaAccountStrategy(numiaConfig.url, numiaConfig.authToken),
      );
    }
  }

  // Add AA-API strategy if configured (canonical source fallback)
  if (config.aaApi) {
    strategies.push(new AAApiAccountStrategy(config.aaApi));
  }

  // Add RPC strategy if configured (reliable fallback)
  if (config.rpc) {
    strategies.push(new RpcAccountStrategy(config.rpc));
  }

  // Always add empty strategy as final fallback (creates new account)
  strategies.push(new EmptyAccountStrategy());

  return new CompositeAccountStrategy(...strategies);
}
