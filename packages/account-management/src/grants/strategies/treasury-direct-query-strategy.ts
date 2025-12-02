/**
 * Direct Query Treasury Strategy
 * Fetches treasury configurations directly from the smart contract via RPC
 * This is the fallback approach when indexers are unavailable
 *
 * Based on dashboard's src/treasury-strategies/direct-query-treasury-strategy.ts
 */

import type {
  TreasuryStrategy,
  TreasuryConfig,
  TreasuryParams,
} from "../../types/treasury";
import type { ContractQueryClient } from "../discovery";
import type { TreasuryGrantConfig } from "@burnt-labs/abstraxion-core";

// Helper to validate URLs for security
function isUrlSafe(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Direct Query Treasury Strategy
 * Queries treasury contract directly via RPC (no indexer needed)
 */
export class DirectQueryTreasuryStrategy implements TreasuryStrategy {
  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: ContractQueryClient,
  ): Promise<TreasuryConfig | null> {
    try {

      // Query all grant config type URLs
      const queryTreasuryContractMsg = {
        grant_config_type_urls: {},
      };

      const queryAllTypeUrlsResponse = (await client.queryContractSmart(
        treasuryAddress,
        queryTreasuryContractMsg,
      )) as string[];

      if (!queryAllTypeUrlsResponse || queryAllTypeUrlsResponse.length === 0) {
        return null;
      }

      // Query each grant config by type URL
      const grantConfigs = await Promise.all(
        queryAllTypeUrlsResponse.map(async (typeUrl) => {
          const queryByMsg = {
            grant_config_by_type_url: {
              msg_type_url: typeUrl,
            },
          };

          const grantConfig = await client.queryContractSmart(
            treasuryAddress,
            queryByMsg,
          ) as TreasuryGrantConfig;

          if (!grantConfig || !grantConfig.description) {
            throw new Error(`Invalid grant config for type URL: ${typeUrl}`);
          }

          return grantConfig;
        }),
      );

      // Query params
      const params = await this.fetchTreasuryParams(client, treasuryAddress);

      return {
        grantConfigs,
        params,
      };
    } catch (error) {
      // Re-throw error instead of returning null
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Direct query treasury strategy failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Fetch treasury params directly from contract
   */
  private async fetchTreasuryParams(
    client: ContractQueryClient,
    treasuryAddress: string,
  ): Promise<TreasuryParams> {
    try {
      const queryParams = { params: {} };
      const params = await client.queryContractSmart(
        treasuryAddress,
        queryParams,
      ) as TreasuryParams;

      // Validate URLs for security
      return {
        redirect_url: isUrlSafe(params.redirect_url) ? params.redirect_url : "",
        icon_url: isUrlSafe(params.icon_url) ? params.icon_url : "",
        metadata: isUrlSafe(params.metadata) ? params.metadata : "",
      };
    } catch (error) {
      // Return safe defaults on error (params are optional)
      return {
        redirect_url: "",
        icon_url: "",
        metadata: "",
      };
    }
  }
}
