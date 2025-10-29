/**
 * Factory function for creating a CompositeAccountStrategy with common fallback chain
 * Provides a convenient way to create a strategy without manually instantiating each one
 */

import { NumiaAccountStrategy } from "./account-numia-strategy";
import { RpcAccountStrategy } from "./account-rpc-strategy";
import { EmptyAccountStrategy } from "./account-empty-strategy";
import { CompositeAccountStrategy } from "./account-composite-strategy";
import type { RpcAccountStrategyConfig } from "./account-rpc-strategy";

export interface CreateCompositeAccountStrategyConfig {
  /**
   * Indexer configuration for fast account lookups
   * If provided, NumiaAccountStrategy will be used as the first strategy
   */
  indexer?: {
    url: string;
    authToken?: string;
  };

  /**
   * RPC configuration for reliable on-chain account lookups
   * If provided, RpcAccountStrategy will be used as a fallback
   */
  rpc?: RpcAccountStrategyConfig;
}

/**
 * Creates a CompositeAccountStrategy with automatic fallback chain:
 * 1. NumiaAccountStrategy (if indexer config provided) - Fast indexer queries
 * 2. RpcAccountStrategy (if RPC config provided) - Reliable on-chain queries
 * 3. EmptyAccountStrategy (always included) - Returns empty for new accounts
 *
 * @param config - Configuration for the strategies to include
 * @returns CompositeAccountStrategy with configured fallback chain
 *
 * @example
 * ```typescript
 * // With both indexer and RPC fallback
 * const strategy = createCompositeAccountStrategy({
 *   indexer: {
 *     url: 'https://indexer.example.com',
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
 * // With only indexer
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

  // Add Numia indexer strategy if configured (fast)
  if (config.indexer) {
    strategies.push(
      new NumiaAccountStrategy(config.indexer.url, config.indexer.authToken)
    );
  }

  // Add RPC strategy if configured (reliable fallback)
  if (config.rpc) {
    strategies.push(new RpcAccountStrategy(config.rpc));
  }

  // Always add empty strategy as final fallback (creates new account)
  strategies.push(new EmptyAccountStrategy());

  return new CompositeAccountStrategy(...strategies);
}
