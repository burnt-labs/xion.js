import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as AuthzQueryClient } from "cosmjs-types/cosmos/authz/v1beta1/query";
import type { GrantsResponse, TreasuryGrantConfig } from "@/types";
import { fetchConfig, getRpcClient } from "@/utils";

/**
 * Interface representing the response from the treasury indexer
 * The response is now a direct record of type URLs to TreasuryGrantConfig objects
 */
type TreasuryIndexerResponse = Record<string, TreasuryGrantConfig>;

// Cache for fetchTreasuryDataFromIndexer results to avoid redundant network requests
const treasuryDataCache: Record<string, Promise<TreasuryIndexerResponse>> = {};

/**
 * Fetches treasury data from the indexer
 * Results are memoized by treasuryAddress and rpcUrl to prevent duplicate requests
 *
 * @param {string} treasuryAddress - The address of the treasury contract
 * @param {string} rpcUrl - The RPC URL used to determine the network ID
 * @returns {Promise<TreasuryIndexerResponse>} - A promise that resolves to the treasury data
 */
export const fetchTreasuryDataFromIndexer = async (
  treasuryAddress: string,
  rpcUrl: string,
): Promise<TreasuryIndexerResponse> => {
  // Create a cache key using treasuryAddress and rpcUrl
  const cacheKey = `${treasuryAddress}:${rpcUrl}`;

  // Return cached result if available
  if (Object.prototype.hasOwnProperty.call(treasuryDataCache, cacheKey)) {
    console.debug(`Using cached treasury data for ${treasuryAddress}`);
    return treasuryDataCache[cacheKey];
  }

  // Create a promise for the fetch operation
  const fetchPromise = (async () => {
    // Get the network ID from the fetchConfig function
    const { networkId } = await fetchConfig(rpcUrl);

    // TODO: Should the indexer URL be a env variable?
    const indexerUrl = `https://daodaoindexer.burnt.com/${networkId}/contract/${treasuryAddress}/xion/treasury/grantConfigs`;

    try {
      // Check if fetch is available (it might not be in test environments)
      if (typeof fetch === "undefined") {
        throw new Error("Fetch API not available");
      }

      console.debug(
        `Fetching treasury data from indexer for ${treasuryAddress}`,
      );
      const response = await fetch(indexerUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch treasury data: ${response.statusText}`,
        );
      }

      // The response is now directly a record of type URLs to TreasuryGrantConfig objects
      const grantConfigsData: TreasuryIndexerResponse = await response.json();
      return grantConfigsData;
    } catch (error) {
      console.error("Error fetching treasury data from indexer:", error);
      // Return a default empty response instead of throwing
      // This allows the fallback mechanism to work in the calling functions
      return {}; // Empty record
    }
  })();

  // Store the promise in the cache
  treasuryDataCache[cacheKey] = fetchPromise;

  // Return the promise
  return fetchPromise;
};

/**
 * Retrieves the treasury grant configurations directly from the indexer.
 * This function combines the functionality of getTreasuryContractTypeUrls and getTreasuryContractConfigsByTypeUrl.
 *
 * @param {CosmWasmClient} client - The CosmWasm client (used for fallback if indexer fails).
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string} [rpcUrl] - The RPC URL used to determine the network ID.
 * @returns {Promise<TreasuryGrantConfig[]>} - A promise that resolves to an array of TreasuryGrantConfig objects.
 */
export const getTreasuryGrantConfigs = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  rpcUrl?: string,
): Promise<TreasuryGrantConfig[]> => {
  try {
    if (!rpcUrl) {
      throw new Error("RPC URL is required to determine the network ID");
    }
    const treasuryData = await fetchTreasuryDataFromIndexer(
      treasuryAddress,
      rpcUrl,
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
): Promise<string[]> => {
  try {
    if (!rpcUrl) {
      throw new Error("RPC URL is required to determine the network ID");
    }
    const treasuryData = await fetchTreasuryDataFromIndexer(
      treasuryAddress,
      rpcUrl,
    );
    return Object.keys(treasuryData);
  } catch (error) {
    console.error("Error getting treasury contract type URLs:", error);
    // Fallback to the original implementation if the indexer fails
    const queryTreasuryContractMsg = { grant_config_type_urls: {} };
    return await client.queryContractSmart(
      treasuryAddress,
      queryTreasuryContractMsg,
    );
  }
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
): Promise<TreasuryGrantConfig[]> => {
  try {
    if (!rpcUrl) {
      throw new Error("RPC URL is required to determine the network ID");
    }
    const treasuryData = await fetchTreasuryDataFromIndexer(
      treasuryAddress,
      rpcUrl,
    );
    const treasuryGrantConfigs: TreasuryGrantConfig[] = [];

    for (const typeUrl of typeUrls) {
      if (treasuryData[typeUrl]) {
        treasuryGrantConfigs.push(treasuryData[typeUrl]);
      }
    }

    return treasuryGrantConfigs;
  } catch (error) {
    console.error("Error getting treasury grant configs from indexer:", error);
    // Fallback to the original implementation if the indexer fails
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
  }
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
