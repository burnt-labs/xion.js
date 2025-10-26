/**
 * DaoDao Treasury Indexer Strategy
 * Fetches treasury configurations from the DaoDao indexer API
 * This is the fastest approach when the indexer is available
 *
 * How it works:
 * 1. Queries DaoDao indexer API at /{chainId}/contract/{address}/xion/treasury/all
 * 2. Transforms indexer response to standard TreasuryConfig format
 * 3. Validates all data for security (URLs, structure)
 *
 * Based on dashboard's src/treasury-strategies/daodao-treasury-strategy.ts
 */

import type { TreasuryStrategy, TreasuryConfig, GrantConfigByTypeUrl, TreasuryParams } from "../../types/treasury";

// Helper to validate URLs for security
function isUrlSafe(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// DaoDao indexer response formats
interface TreasuryIndexerGrantConfig {
  authorization: {
    type_url: string;
    value: string; // base64 encoded
  };
  description: string;
  optional?: boolean;
  allowance?: {
    type_url: string;
    value: string;
  };
  maxDuration?: number;
}

interface TreasuryIndexerAllResponse {
  grantConfigs: {
    [typeUrl: string]: TreasuryIndexerGrantConfig;
  };
  params: {
    icon_url?: string;
    redirect_url?: string;
    metadata?: string;
    display_url?: string;
  };
  feeConfig?: unknown;
  admin?: string;
  pendingAdmin?: string | null;
  balances?: Record<string, unknown>;
}

export interface DaoDaoTreasuryStrategyConfig {
  /** DaoDao indexer base URL (e.g., "https://daodaoindexer.burnt.com") */
  indexerUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * DaoDao Treasury Indexer Strategy
 * Queries DaoDao indexer API for treasury configurations (fast, requires indexer)
 *
 * Example usage:
 * ```typescript
 * const strategy = new DaoDaoTreasuryStrategy({
 *   indexerUrl: "https://daodaoindexer.burnt.com",
 * });
 * const config = await strategy.fetchTreasuryConfig(treasuryAddress, client);
 * ```
 */
export class DaoDaoTreasuryStrategy implements TreasuryStrategy {
  private config: DaoDaoTreasuryStrategyConfig;

  constructor(config: DaoDaoTreasuryStrategyConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    };
  }

  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: any, // AAClient from @burnt-labs/signers
  ): Promise<TreasuryConfig | null> {
    try {
      console.log(`[DaoDaoTreasuryStrategy] Querying indexer for treasury: ${treasuryAddress}`);

      // Get chain ID from client
      const chainId = await client.getChainId();

      // Use the /all endpoint to get everything in one call
      const indexerUrl = `${this.config.indexerUrl}/${chainId}/contract/${treasuryAddress}/xion/treasury/all`;

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(indexerUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `DaoDao indexer returned ${response.status}: ${response.statusText}`,
          );
        }

        const data = await response.json();
        const validatedData = this.validateAllResponse(data);

        // Transform grant configs from the response
        const grantConfigs = this.transformAllResponseGrants(
          validatedData.grantConfigs,
        );

        // Extract and validate params from the response
        const params: TreasuryParams = {
          display_url: isUrlSafe(validatedData.params.display_url)
            ? validatedData.params.display_url || ""
            : "",
          redirect_url: isUrlSafe(validatedData.params.redirect_url)
            ? validatedData.params.redirect_url || ""
            : "",
          icon_url: isUrlSafe(validatedData.params.icon_url)
            ? validatedData.params.icon_url || ""
            : "",
        };

        console.log(`[DaoDaoTreasuryStrategy] ✅ Successfully fetched treasury config`);

        return {
          grantConfigs,
          params,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(
            `DaoDao indexer request timed out after ${this.config.timeout}ms`,
          );
        }
        throw error;
      }
    } catch (error) {
      console.debug("[DaoDaoTreasuryStrategy] Failed to fetch treasury config:", error);
      return null;
    }
  }

  /**
   * Validates the /all endpoint response structure
   */
  private validateAllResponse(data: unknown): TreasuryIndexerAllResponse {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid indexer response: not an object");
    }

    const response = data as Record<string, unknown>;

    // Validate the top-level structure
    if (!response.grantConfigs || typeof response.grantConfigs !== "object") {
      throw new Error("Invalid indexer response: missing grantConfigs");
    }

    if (!response.params || typeof response.params !== "object") {
      throw new Error("Invalid indexer response: missing params");
    }

    // Validate each grant config
    const grantConfigs = response.grantConfigs as Record<string, unknown>;
    for (const [typeUrl, config] of Object.entries(grantConfigs)) {
      if (!config || typeof config !== "object") {
        throw new Error(`Invalid grant config for ${typeUrl}`);
      }

      const grantConfig = config as Record<string, unknown>;

      // Check required fields
      if (
        !grantConfig.authorization ||
        typeof grantConfig.authorization !== "object"
      ) {
        throw new Error(`Missing authorization for ${typeUrl}`);
      }

      const auth = grantConfig.authorization as Record<string, unknown>;
      if (typeof auth.type_url !== "string" || typeof auth.value !== "string") {
        throw new Error(`Invalid authorization format for ${typeUrl}`);
      }

      if (typeof grantConfig.description !== "string") {
        throw new Error(`Missing description for ${typeUrl}`);
      }
    }

    // We've validated the structure, so we can safely return it
    return data as TreasuryIndexerAllResponse;
  }

  /**
   * Transform grant configs from /all response to standard format
   */
  private transformAllResponseGrants(
    grantConfigs: Record<string, TreasuryIndexerGrantConfig>,
  ): GrantConfigByTypeUrl[] {
    const result: GrantConfigByTypeUrl[] = [];

    for (const config of Object.values(grantConfigs)) {
      result.push({
        authorization: config.authorization,
        description: config.description,
        allowance: config.allowance || { type_url: "", value: "" },
        maxDuration: config.maxDuration,
      });
    }

    return result;
  }
}
