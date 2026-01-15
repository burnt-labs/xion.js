/**
 * Utilities for converting user-facing indexer configs to AccountIndexerConfig
 *
 * These utilities are generic and work with any user-facing indexer config type
 * that matches the shape of the discriminated union (Numia or Subquery).
 */

import type {
  UserIndexerConfig,
  AccountIndexerConfig,
} from "../../types/indexer";
import type { SmartAccountContractConfig } from "../../types";

/**
 * Extract authentication token from indexer config
 * Only available for Numia indexers
 *
 * @param indexerConfig - User-facing indexer configuration
 * @returns Authentication token if Numia indexer, undefined otherwise
 */
export function extractIndexerAuthToken(
  indexerConfig?: UserIndexerConfig,
): string | undefined {
  if (!indexerConfig) {
    return undefined;
  }

  // Only Numia indexers have authToken
  if (indexerConfig.type !== "subquery") {
    return "authToken" in indexerConfig ? indexerConfig.authToken : undefined;
  }

  return undefined;
}

/**
 * Convert user-facing indexer config to internal AccountIndexerConfig
 * Handles type conversion and derives codeId from smartAccountContract for Subquery indexers
 *
 * @param indexerConfig - User-facing indexer configuration
 * @param smartAccountContract - Smart account contract config (required for Subquery codeId)
 * @returns AccountIndexerConfig for use with account strategies, or undefined if no indexer config
 * @throws Error if Subquery indexer is used without codeId in smartAccountContract
 */
export function convertIndexerConfig(
  indexerConfig: UserIndexerConfig | undefined,
  smartAccountContract?: SmartAccountContractConfig,
): AccountIndexerConfig | undefined {
  if (!indexerConfig) {
    return undefined;
  }

  // Handle Subquery indexer
  if (indexerConfig.type === "subquery") {
    if (!smartAccountContract?.codeId) {
      throw new Error(
        "Code ID is required when using Subquery indexer. Provide smartAccountContract with codeId.",
      );
    }
    return {
      type: "subquery" as const,
      url: indexerConfig.url,
      codeId: smartAccountContract.codeId,
    };
  }

  // Handle Numia indexer (type is 'numia' or undefined)
  // TypeScript narrows to Numia variant after Subquery check
  return {
    type: "numia" as const,
    url: indexerConfig.url,
    authToken:
      "authToken" in indexerConfig ? indexerConfig.authToken : undefined,
  };
}
