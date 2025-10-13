import type { AAClient } from "../signers";
import type { TreasuryConfig, TreasuryStrategy } from "./types";
import type {
  GrantConfigByTypeUrl,
  TreasuryParams,
} from "../types/treasury-types";
import { treasuryCacheManager } from "../utils/cache";
import { isUrlSafe } from "../utils/url";

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
    display_url?: string; // might not be in response
  };
  feeConfig?: unknown;
  admin?: string;
  pendingAdmin?: string | null;
  balances?: Record<string, unknown>;
}

/**
 * DaoDao Treasury Strategy
 * Fetches treasury configurations from the DaoDao indexer with caching
 */
export class DaoDaoTreasuryStrategy implements TreasuryStrategy {
  private readonly indexerBaseUrl: string;

  constructor(indexerUrl?: string) {
    this.indexerBaseUrl =
      indexerUrl ||
      import.meta.env.VITE_DAODAO_TREASURY_INDEXER_URL ||
      "https://daodaoindexer.burnt.com";
  }

  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: AAClient,
  ): Promise<TreasuryConfig | null> {
    try {
      const chainId = await client.getChainId();

      // Create cache key
      const cacheKey = `${treasuryAddress}:${chainId}`;

      // Try to fetch grant configs from indexer (with caching)
      const cacheResult = await treasuryCacheManager.get(cacheKey, async () => {
        // Use the /all endpoint to get everything in one call!
        const indexerUrl = `${this.indexerBaseUrl}/${chainId}/contract/${treasuryAddress}/xion/treasury/all`;

        // Add timeout to prevent hanging requests (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          return this.validateAllResponse(data);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(
              "DaoDao indexer request timed out after 30 seconds",
            );
          }
          throw error;
        }
      });

      const allData = cacheResult.data as TreasuryIndexerAllResponse;

      // Transform grant configs from the response
      const grantConfigs = this.transformAllResponseGrants(
        allData.grantConfigs,
      );

      // Extract and validate params from the response - no separate query needed!
      const params: TreasuryParams = {
        display_url: isUrlSafe(allData.params.display_url)
          ? allData.params.display_url || ""
          : "",
        redirect_url: isUrlSafe(allData.params.redirect_url)
          ? allData.params.redirect_url || ""
          : "",
        icon_url: isUrlSafe(allData.params.icon_url)
          ? allData.params.icon_url || ""
          : "",
      };

      return {
        grantConfigs,
        params,
      };
    } catch (error) {
      console.debug("DaoDao treasury strategy failed:", error);
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
   * Transform grant configs from /all response to our format
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
