/**
 * Factory function for creating a CompositeAccountStrategy with common fallback chain
 * Provides a convenient way to create a strategy without manually instantiating each one
 */

import { NumiaAccountStrategy } from "./account-numia-strategy";
import { SubqueryAccountStrategy } from "./account-subquery-strategy";
import { RpcAccountStrategy } from "./account-rpc-strategy";
import { EmptyAccountStrategy } from "./account-empty-strategy";
import { CompositeAccountStrategy } from "./account-composite-strategy";
import type { RpcAccountStrategyConfig } from "./account-rpc-strategy";

/**
 * Indexer configuration for account discovery
 * Discriminated union supporting both Numia and Subquery indexers
 */
export type AccountIndexerConfig =
  | { type?: 'numia'; url: string; authToken?: string }
  | { type: 'subquery'; url: string; codeId: number };

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
   * RPC configuration for reliable on-chain account lookups
   * If provided, RpcAccountStrategy will be used as a fallback
   */
  rpc?: RpcAccountStrategyConfig;
}

/**
 * Creates a CompositeAccountStrategy with automatic fallback chain:
 * 1. Indexer strategy (Numia or Subquery, if configured) - Fast indexer queries
 * 2. RpcAccountStrategy (if RPC config provided) - Reliable on-chain queries
 * 3. EmptyAccountStrategy (always included) - Returns empty for new accounts
 *
 * @param config - Configuration for the strategies to include
 * @returns CompositeAccountStrategy with configured fallback chain
 *
 * @example
 * ```typescript
 * // With Numia indexer and RPC fallback
 * const strategy = createCompositeAccountStrategy({
 *   indexer: {
 *     type: 'numia',
 *     url: 'https://xion-testnet-2.numia.xyz/v3',
 *     authToken: 'token123'
 *   },
 *   rpc: {
 *     rpcUrl: 'https://rpc.xion.com',
 *     checksum: '0x123...',
 *     creator: 'xion1...',
 *     prefix: 'xion',
 *     codeId: 1
 *   }
 * });
 *
 * // With Subquery indexer
 * const strategy = createCompositeAccountStrategy({
 *   indexer: {
 *     type: 'subquery',
 *     url: 'https://subquery.example.com',
 *     codeId: 1
 *   }
 * });
 *
 * // With default (Numia) indexer
 * const strategy = createCompositeAccountStrategy({
 *   indexer: { url: 'https://indexer.example.com' }
 * });
 *
 * // Minimal (only EmptyAccountStrategy)
 * const strategy = createCompositeAccountStrategy({});
 * ```
 */
export function createCompositeAccountStrategy(
  config: CreateCompositeAccountStrategyConfig
): CompositeAccountStrategy {
  const strategies = [];

  // Add indexer strategy if configured (fast)
  if (config.indexer) {
    const indexerType = 'type' in config.indexer ? config.indexer.type : 'numia';

    if (indexerType === 'subquery') {
      // Subquery indexer
      const subqueryConfig = config.indexer as { type: 'subquery'; url: string; codeId: number };
      strategies.push(
        new SubqueryAccountStrategy(subqueryConfig.url, subqueryConfig.codeId)
      );
    } else {
      // Numia indexer (default)
      const numiaConfig = config.indexer as { type?: 'numia'; url: string; authToken?: string };
      strategies.push(
        new NumiaAccountStrategy(numiaConfig.url, numiaConfig.authToken)
      );
    }
  }

  // Add RPC strategy if configured (reliable fallback)
  if (config.rpc) {
    strategies.push(new RpcAccountStrategy(config.rpc));
  }

  // Always add empty strategy as final fallback (creates new account)
  strategies.push(new EmptyAccountStrategy());

  return new CompositeAccountStrategy(...strategies);
}
