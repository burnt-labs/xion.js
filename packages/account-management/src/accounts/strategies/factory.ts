/**
 * Factory function for creating a CompositeAccountStrategy with common fallback chain
 * Provides a convenient way to create a strategy without manually instantiating each one
 */

import { DaoDaoAccountStrategy } from "./account-daodao-strategy";
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
   *
   * For DaoDao: { type: 'daodao', url: string, chainId: string }
   * For Subquery: { type: 'subquery', url: string, codeId: number }
   * For Numia (deprecated): { type: 'numia', url: string, authToken?: string }
   *
   * If type is not specified, defaults to Numia for backward compatibility
   */
  indexer?: AccountIndexerConfig;

  /**
   * AA-API configuration for canonical account lookups
   *
   * - v1 (default): JWT authenticators (aud.sub format), used as a fallback
   *   after the indexer.
   * - v2: EthWallet/Secp256K1 lookups through the AA API, verified on chain.
   *   When v2 is configured it is the ONLY strategy: `indexer`, `rpc` and the
   *   empty fallback are not added, so an AA API or RPC error surfaces as an
   *   error instead of an empty "no account" result.
   */
  aaApi?: AAApiAccountStrategyConfig;

  /**
   * RPC configuration (deprecated adapter over the AA API v2 strategy).
   * Requires `aaApiUrl`; see RpcAccountStrategy.
   */
  rpc?: RpcAccountStrategyConfig;
}

/**
 * Creates a CompositeAccountStrategy.
 *
 * With `aaApi.version === "v2"` the composite contains only the AA API v2
 * strategy (see `aaApi`). Otherwise it builds the fallback chain:
 * 1. Indexer strategy (DaoDao, Subquery or deprecated Numia, if configured) - Fast indexer queries
 * 2. AA-API strategy (if configured) - Canonical account state fallback
 * 3. RpcAccountStrategy (if RPC config provided) - Reliable on-chain queries
 * 4. EmptyAccountStrategy (always included) - Returns empty for new accounts
 *
 * Recommended fallback chain for production:
 * - DaoDao (fast, comprehensive)
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
  // AA API v2 is the canonical source: no indexer, RPC or empty fallback that
  // could turn a lookup failure into a successful empty discovery.
  if (config.aaApi?.version === "v2") {
    return new CompositeAccountStrategy(new AAApiAccountStrategy(config.aaApi));
  }

  const strategies = [];

  // Add indexer strategy if configured (fast)
  if (config.indexer) {
    const indexerType =
      "type" in config.indexer ? config.indexer.type : "numia";

    if (indexerType === "daodao") {
      const daodaoConfig = config.indexer as {
        type: "daodao";
        url: string;
        chainId: string;
      };
      strategies.push(
        new DaoDaoAccountStrategy(daodaoConfig.url, daodaoConfig.chainId),
      );
    } else if (indexerType === "subquery") {
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
      // Numia indexer (deprecated; still the default when type is omitted)
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
