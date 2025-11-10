/**
 * Direct Query Treasury Strategy
 * Fetches treasury configurations directly from the smart contract via RPC
 * This is the fallback approach when indexers are unavailable
 *
 * Based on dashboard's src/treasury-strategies/direct-query-treasury-strategy.ts
 */

import type { TreasuryStrategy, TreasuryConfig } from "../../types/treasury";

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
    client: any, // AAClient from @burnt-labs/signers
  ): Promise<TreasuryConfig | null> {
    try {
      console.log(
        `[DirectQueryTreasuryStrategy] Querying treasury contract: ${treasuryAddress}`,
      );

      // Query all grant config type URLs
      const queryTreasuryContractMsg = {
        grant_config_type_urls: {},
      };

      const queryAllTypeUrlsResponse = (await client.queryContractSmart(
        treasuryAddress,
        queryTreasuryContractMsg,
      )) as string[];

      if (!queryAllTypeUrlsResponse || queryAllTypeUrlsResponse.length === 0) {
        console.debug(
          "[DirectQueryTreasuryStrategy] No grant configs found in treasury contract",
        );
        return null;
      }

      console.log(
        `[DirectQueryTreasuryStrategy] Found ${queryAllTypeUrlsResponse.length} grant config type URLs`,
      );

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
          );

          if (!grantConfig || !grantConfig.description) {
            throw new Error(`Invalid grant config for type URL: ${typeUrl}`);
          }

          return grantConfig;
        }),
      );

      // Query params
      const params = await this.fetchTreasuryParams(client, treasuryAddress);

      console.log(
        `[DirectQueryTreasuryStrategy] Successfully fetched treasury config`,
      );

      return {
        grantConfigs,
        params,
      };
    } catch (error) {
      console.error(
        "[DirectQueryTreasuryStrategy] Failed to fetch treasury config:",
        error,
      );
      return null;
    }
  }

  /**
   * Fetch treasury params directly from contract
   */
  private async fetchTreasuryParams(
    client: any,
    treasuryAddress: string,
  ): Promise<{ display_url: string; redirect_url: string; icon_url: string }> {
    try {
      const queryParams = { params: {} };
      const params = await client.queryContractSmart(
        treasuryAddress,
        queryParams,
      );

      // Validate URLs for security
      return {
        display_url: isUrlSafe(params.display_url) ? params.display_url : "",
        redirect_url: isUrlSafe(params.redirect_url) ? params.redirect_url : "",
        icon_url: isUrlSafe(params.icon_url) ? params.icon_url : "",
      };
    } catch (error) {
      console.warn(
        "[DirectQueryTreasuryStrategy] Error querying treasury params:",
        error,
      );
      // Return safe defaults
      return {
        display_url: "",
        redirect_url: "",
        icon_url: "",
      };
    }
  }
}
