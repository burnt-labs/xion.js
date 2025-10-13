/**
 * Treasury strategy factory
 * Extracted from dashboard hooks/useTreasuryStrategy.ts (pure logic only)
 */

import { DaoDaoTreasuryStrategy } from "./daodao-treasury-strategy";
import { DirectQueryTreasuryStrategy } from "./direct-query-treasury-strategy";
import { CompositeTreasuryStrategy } from "./composite-treasury-strategy";
import type { TreasuryStrategy } from "./types";

/**
 * Available treasury strategy options
 */
export enum TreasuryStrategyType {
  DAODAO = "daodao",
  DIRECT = "direct",
  COMPOSITE = "composite",
}

/**
 * Get a treasury strategy instance
 *
 * @param strategyType - Which strategy to use (defaults to COMPOSITE)
 * @param daodaoIndexerUrl - Optional custom DaoDao indexer URL
 * @returns TreasuryStrategy instance
 */
export function getTreasuryStrategy(
  strategyType: TreasuryStrategyType = TreasuryStrategyType.COMPOSITE,
  daodaoIndexerUrl?: string,
): TreasuryStrategy {
  switch (strategyType) {
    case TreasuryStrategyType.DAODAO:
      return new DaoDaoTreasuryStrategy(daodaoIndexerUrl);

    case TreasuryStrategyType.DIRECT:
      return new DirectQueryTreasuryStrategy();

    case TreasuryStrategyType.COMPOSITE:
    default:
      // Use DaoDao as primary, direct query as fallback
      return new CompositeTreasuryStrategy(
        new DaoDaoTreasuryStrategy(daodaoIndexerUrl),
        new DirectQueryTreasuryStrategy(),
      );
  }
}

/**
 * Create a custom composite strategy with specific strategies
 *
 * @param strategies - Array of strategies to try in order
 * @returns CompositeTreasuryStrategy instance
 */
export function createCompositeStrategy(
  ...strategies: TreasuryStrategy[]
): CompositeTreasuryStrategy {
  return new CompositeTreasuryStrategy(...strategies);
}
