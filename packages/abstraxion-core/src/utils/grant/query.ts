import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as AuthzQueryClient } from "cosmjs-types/cosmos/authz/v1beta1/query";
import type { GrantsResponse, TreasuryGrantConfig } from "@/types";
import { fetchConfig, getRpcClient } from "@/utils";
import { CacheManager } from "@/utils/cache/CacheManager";
import {
  IndexerError,
  IndexerNetworkError,
  IndexerResponseError,
  TreasuryConfigError,
} from "./errors";
import { validateTreasuryIndexerResponse } from "./validation";

/**
 * Interface representing the response from the treasury indexer
 * The response is now a direct record of type URLs to TreasuryGrantConfig objects
 */
type TreasuryIndexerResponse = Record<string, TreasuryGrantConfig>;

// Cache TTL in milliseconds (10 minutes for treasury data)
const TREASURY_CACHE_TTL = 10 * 60 * 1000;

// Create a singleton cache manager for treasury data
const treasuryCacheManager = new CacheManager<TreasuryIndexerResponse>({
  ttl: TREASURY_CACHE_TTL,
  debugLabel: "treasury data",
});

/**
 * Fetches treasury data from the indexer
 * Results are memoized by treasuryAddress and rpcUrl to prevent duplicate requests
 *
 * @param {string} treasuryAddress - The address of the treasury contract
 * @param {string} rpcUrl - The RPC URL used to determine the network ID
 * @param {string} [customIndexerUrl] - Optional custom indexer URL to use instead of default
 * @returns {Promise<TreasuryIndexerResponse>} - A promise that resolves to the treasury data
 */
export const fetchTreasuryDataFromIndexer = async (
  treasuryAddress: string,
  rpcUrl: string,
  customIndexerUrl?: string,
  authToken?: string,
): Promise<TreasuryIndexerResponse> => {
  // Create a cache key using treasuryAddress and rpcUrl
  const cacheKey = `${treasuryAddress}:${rpcUrl}`;

  return treasuryCacheManager.get(cacheKey, async () => {
    // Get the network ID from the fetchConfig function
    const { networkId } = await fetchConfig(rpcUrl);

    // Use custom indexer URL if provided, otherwise use default
    const indexerBaseUrl =
      customIndexerUrl || "https://daodaoindexer.burnt.com";
    const indexerUrl = `${indexerBaseUrl}/${networkId}/contract/${treasuryAddress}/xion/treasury/grantConfigs`;

    try {
      // Check if fetch is available (it might not be in test environments)
      if (typeof fetch === "undefined") {
        throw new IndexerNetworkError("Fetch API not available", indexerUrl);
      }

      console.debug(
        `Fetching treasury data from indexer for ${treasuryAddress}`,
      );

      // Prepare fetch options with authorization header if token is provided
      const fetchOptions: RequestInit = {};
      if (authToken) {
        fetchOptions.headers = {
          'Authorization': `Bearer ${authToken}`,
        };
      }

      const response = await fetch(indexerUrl, fetchOptions);
      if (!response.ok) {
        throw new IndexerResponseError(
          `Failed to fetch treasury data: ${response.statusText}`,
          response.status,
          indexerUrl,
        );
      }

      // The response is now directly a record of type URLs to TreasuryGrantConfig objects
      const rawData = await response.json();
      const grantConfigsData = validateTreasuryIndexerResponse(rawData);
      return grantConfigsData;
    } catch (error) {
      // Log specific error types differently
      if (error instanceof IndexerError) {
        console.warn(`Indexer error for ${treasuryAddress}: ${error.message}`, {
          statusCode: error.statusCode,
          indexerUrl: error.indexerUrl,
        });
      } else {
        console.error("Error fetching treasury data from indexer:", error);
      }
      // Don't cache errors - re-throw to prevent caching
      // This allows the fallback mechanism to work in the calling functions
      throw error; // Re-throw to prevent caching of failed requests
    }
  });
};

/**
 * Manually clear the treasury data cache
 */
export const clearTreasuryCache = (): void => {
  treasuryCacheManager.clear();
};

/**
 * Get the treasury cache manager instance (useful for testing)
 */
export function getTreasuryCacheManager(): CacheManager<TreasuryIndexerResponse> {
  return treasuryCacheManager;
}

/**
 * Retrieves the treasury grant configurations directly from the indexer.
 * This function combines the functionality of getTreasuryContractTypeUrls and getTreasuryContractConfigsByTypeUrl.
 *
 * @param {CosmWasmClient} client - The CosmWasm client (used for fallback if indexer fails).
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string} [rpcUrl] - The RPC URL used to determine the network ID.
 * @param {string} [indexerUrl] - Optional custom indexer URL to use instead of default.
 * @returns {Promise<TreasuryGrantConfig[]>} - A promise that resolves to an array of TreasuryGrantConfig objects.
 */
export const getTreasuryGrantConfigs = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  rpcUrl?: string,
  indexerUrl?: string,
  authToken?: string,
): Promise<TreasuryGrantConfig[]> => {
  try {
    if (!rpcUrl) {
      throw new TreasuryConfigError(
        "RPC URL is required to determine the network ID",
      );
    }
    const treasuryData = await fetchTreasuryDataFromIndexer(
      treasuryAddress,
      rpcUrl,
      indexerUrl,
      authToken,
    );
    const treasuryGrantConfigs: TreasuryGrantConfig[] = [];

    // Convert the response object to an array of TreasuryGrantConfig objects
    for (const typeUrl of Object.keys(treasuryData)) {
      if (treasuryData[typeUrl]) {
        treasuryGrantConfigs.push(treasuryData[typeUrl]);
      }
    }

    return treasuryGrantConfigs;
  } catch (error) {
    console.error("Error getting treasury grant configs from indexer:", error);
    // Fallback to the original implementation if the indexer fails
    try {
      // First get the type URLs
      const queryTreasuryContractMsg = { grant_config_type_urls: {} };
      const typeUrls: string[] = await client.queryContractSmart(
        treasuryAddress,
        queryTreasuryContractMsg,
      );

      // Then get the grant configs for each type URL
      const treasuryGrantConfigs: TreasuryGrantConfig[] = [];
      for (const typeUrl of typeUrls) {
        const queryByMsg = {
          grant_config_by_type_url: { msg_type_url: typeUrl },
        };
        const grantConfigResponse: TreasuryGrantConfig =
          await client.queryContractSmart(treasuryAddress, queryByMsg);
        treasuryGrantConfigs.push(grantConfigResponse);
      }

      return treasuryGrantConfigs;
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return [];
    }
  }
};

/**
 * Retrieves the type URLs for the treasury contract using the indexer.
 * @deprecated Use getTreasuryGrantConfigs instead.
 *
 * @param {CosmWasmClient} client - The CosmWasm client (not used with indexer but kept for API compatibility).
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string} [rpcUrl] - The RPC URL used to determine the network ID.
 * @returns {Promise<string[]>} - A promise that resolves to an array of type URLs.
 */
export const getTreasuryContractTypeUrls = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  rpcUrl?: string,
  indexerUrl?: string,
): Promise<string[]> => {
  // Simply delegate to the new unified function
  const configs = await getTreasuryGrantConfigs(
    client,
    treasuryAddress,
    rpcUrl,
    indexerUrl,
  );
  return configs.map((config) => config.authorization.type_url);
};

/**
 * Retrieves the treasury grant configurations by type URL using the indexer.
 * @deprecated Use getTreasuryGrantConfigs instead.
 *
 * @param {CosmWasmClient} client - The CosmWasm client (not used with indexer but kept for API compatibility).
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string[]} typeUrls - An array of type URLs to query.
 * @param {string} [rpcUrl] - The RPC URL used to determine the network ID.
 * @returns {Promise<TreasuryGrantConfig[]>} - A promise that resolves to an array of TreasuryGrantConfig objects.
 */
export const getTreasuryContractConfigsByTypeUrl = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  typeUrls: string[],
  rpcUrl?: string,
  indexerUrl?: string,
): Promise<TreasuryGrantConfig[]> => {
  // Get all configs using the unified function
  const allConfigs = await getTreasuryGrantConfigs(
    client,
    treasuryAddress,
    rpcUrl,
    indexerUrl,
  );

  // Filter to only the requested type URLs
  const typeUrlSet = new Set(typeUrls);
  return allConfigs.filter((config) =>
    typeUrlSet.has(config.authorization.type_url),
  );
};

/**
 * Fetch grants issued to a grantee from a granter using ABCI query.
 *
 * @param {string} grantee - The address of the grantee.
 * @param {string} granter - The address of the granter.
 * @param {string} [rpcUrl] - RPC URL to use for fetching grants.
 * @returns {Promise<GrantsResponse>} A Promise that resolves to the grants response.
 * @throws {Error} If the grantee or granter address is invalid, or if there's an error fetching grants.
 */
export const fetchChainGrantsABCI = async (
  grantee?: string,
  granter?: string,
  rpcUrl?: string,
): Promise<GrantsResponse> => {
  if (!grantee) {
    throw new Error("Grantee address is required");
  }
  if (!granter) {
    throw new Error("Granter address is required");
  }

  if (!rpcUrl) {
    throw new Error("RPC URL is required");
  }

  try {
    // Connect to the RPC endpoint using the factory function
    const rpcClient = await getRpcClient(rpcUrl);
    const queryClient = new QueryClient(rpcClient); // @TODO: Singleton..?
    const protobufRpcClient = createProtobufRpcClient(queryClient);

    // Create the authz query client
    const authzClient = new AuthzQueryClient(protobufRpcClient);

    // Query grants using the authz client
    const response = await authzClient.Grants({
      grantee,
      granter,
      msgTypeUrl: "", // Empty string to get all grants
    });

    // Convert the response to the expected GrantsResponse format
    const grantsResponse: GrantsResponse = {
      grants: response.grants.map((grant) => ({
        granter: granter,
        grantee: grantee,
        authorization: grant.authorization,
        expiration: grant.expiration
          ? new Date(Number(grant.expiration.seconds) * 1000).toISOString()
          : "",
      })),
      pagination: {
        next_key: response.pagination?.nextKey?.toString() || null,
        total: response.pagination?.total.toString() || "0",
      },
    };

    return grantsResponse;
  } catch (error) {
    console.error("Error fetching grants:", error);
    throw error;
  } finally {
    // Close the Tendermint client connection
    // No need to explicitly close the connection as it will be garbage collected
  }
};
