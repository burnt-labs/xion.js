/**
 * Factory function for creating a CompositeTreasuryStrategy with common fallback chain
 * Provides a convenient way to create a treasury strategy without manually instantiating each one
 */

import { DaoDaoTreasuryStrategy } from "./treasury-daodao-strategy";
import { DirectQueryTreasuryStrategy } from "./treasury-direct-query-strategy";
import { CompositeTreasuryStrategy } from "./treasury-composite-strategy";

export interface CreateCompositeTreasuryStrategyConfig {
  /**
   * DaoDao indexer configuration for fast treasury lookups
   * If provided, DaoDaoTreasuryStrategy will be used as the first strategy
   */
  daodao?: {
    indexerUrl: string;
  };

  /**
   * Whether to include direct query strategy as fallback
   * Defaults to true - recommended for production reliability
   */
  includeDirectQuery?: boolean;
}

/**
 * Creates a CompositeTreasuryStrategy with automatic fallback chain:
 * 1. DaoDaoTreasuryStrategy (if daodao config provided) - Fast indexer queries
 * 2. DirectQueryTreasuryStrategy (if includeDirectQuery is true) - Reliable on-chain queries
 *
 * @param config - Configuration for the strategies to include
 * @returns CompositeTreasuryStrategy with configured fallback chain
 *
 */
export function createCompositeTreasuryStrategy(
  config: CreateCompositeTreasuryStrategyConfig = {},
): CompositeTreasuryStrategy {
  const strategies = [];

  // Add DaoDao indexer strategy if configured (fast)
  if (config.daodao) {
    strategies.push(
      new DaoDaoTreasuryStrategy({
        indexerUrl: config.daodao.indexerUrl,
      }),
    );
  }

  // Add direct query strategy if requested (reliable fallback)
  // Defaults to true for production reliability
  if (config.includeDirectQuery !== false) {
    strategies.push(new DirectQueryTreasuryStrategy());
  }

  if (strategies.length === 0) {
    throw new Error(
      "createCompositeTreasuryStrategy: At least one strategy must be enabled. " +
        "Either provide daodao config or set includeDirectQuery to true.",
    );
  }

  return new CompositeTreasuryStrategy(...strategies);
}
