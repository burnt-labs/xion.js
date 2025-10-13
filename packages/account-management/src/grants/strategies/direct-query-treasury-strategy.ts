import type { AAClient } from "../signers";
import type { TreasuryConfig, TreasuryStrategy } from "./types";
import type {
  GrantConfigByTypeUrl,
  GrantConfigTypeUrlsResponse,
  TreasuryParams,
} from "../types/treasury-types";
import { isUrlSafe } from "../utils/url";

/**
 * Direct Query Treasury Strategy
 * Fetches treasury configurations directly from the smart contract
 * This is the legacy/fallback approach
 */
export class DirectQueryTreasuryStrategy implements TreasuryStrategy {
  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: AAClient,
  ): Promise<TreasuryConfig | null> {
    try {
      // Query all grant config type URLs
      const queryTreasuryContractMsg = {
        grant_config_type_urls: {},
      };

      const queryAllTypeUrlsResponse = (await client.queryContractSmart(
        treasuryAddress,
        queryTreasuryContractMsg,
      )) as GrantConfigTypeUrlsResponse;

      if (!queryAllTypeUrlsResponse || queryAllTypeUrlsResponse.length === 0) {
        console.debug("No grant configs found in treasury contract");
        return null;
      }

      // Query each grant config by type URL
      const grantConfigs: GrantConfigByTypeUrl[] = await Promise.all(
        queryAllTypeUrlsResponse.map(async (typeUrl) => {
          const queryByMsg = {
            grant_config_by_type_url: {
              msg_type_url: typeUrl,
            },
          };

          const grantConfig: GrantConfigByTypeUrl =
            await client.queryContractSmart(treasuryAddress, queryByMsg);

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
      console.error("Direct query treasury strategy failed:", error);
      return null;
    }
  }

  /**
   * Fetch treasury params directly from contract
   */
  private async fetchTreasuryParams(
    client: AAClient,
    treasuryAddress: string,
  ): Promise<TreasuryParams> {
    try {
      const queryParams = { params: {} };
      const params = (await client.queryContractSmart(
        treasuryAddress,
        queryParams,
      )) as TreasuryParams;

      // Validate URLs for security
      return {
        display_url: isUrlSafe(params.display_url) ? params.display_url : "",
        redirect_url: isUrlSafe(params.redirect_url) ? params.redirect_url : "",
        icon_url: isUrlSafe(params.icon_url) ? params.icon_url : "",
      };
    } catch (error) {
      console.warn("Error querying treasury params:", error);
      // Return safe defaults
      return {
        display_url: "",
        redirect_url: "",
        icon_url: "",
      };
    }
  }
}
