import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as AuthzQueryClient } from "cosmjs-types/cosmos/authz/v1beta1/query";
import type { ChainGrant, TreasuryGrantConfig } from "@/types";
import { fetchConfig, getRpcClient } from "@/utils";
import { CacheManager } from "@/utils/cache/CacheManager";
import { validateTreasuryIndexerResponse } from "./validation";
import { fetchFromDaoDaoIndexer } from "../indexer/treasury-indexer";
import { decodeAuthorization } from "./decoding";
import { AuthorizationTypes } from "./constants";

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
 * @param {string} indexerUrl - Indexer URL (required, must come from environment config)
 * @returns {Promise<TreasuryIndexerResponse>} - A promise that resolves to the treasury data
 */
export const fetchTreasuryDataFromIndexer = async (
  treasuryAddress: string,
  rpcUrl: string,
  indexerUrl: string,
): Promise<TreasuryIndexerResponse> => {
  // Create a cache key using treasuryAddress and rpcUrl
  const cacheKey = `${treasuryAddress}:${rpcUrl}`;

  return treasuryCacheManager.get(cacheKey, async () => {
    // Get the network ID from the fetchConfig function
    const { networkId } = await fetchConfig(rpcUrl);

    try {
      // Use shared low-level indexer fetcher
      const indexerData = await fetchFromDaoDaoIndexer<TreasuryIndexerResponse>(
        treasuryAddress,
        networkId,
        "grantConfigs",
        { indexerUrl },
      );

      const grantConfigsData = validateTreasuryIndexerResponse(indexerData);
      return grantConfigsData;
    } catch (error) {
      // Log and re-throw to prevent caching of failed requests
      console.error(
        `Error fetching treasury data from indexer for ${treasuryAddress}:`,
        error,
      );
      throw error;
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
 * Retrieves the treasury grant configurations with automatic fallback strategy.
 *
 * Strategy (similar to createCompositeTreasuryStrategy):
 * 1. Primary: DaoDao indexer query (fast, cached)
 * 2. Fallback: Direct RPC queries to treasury contract (reliable, slower)
 *
 * @param {CosmWasmClient} client - The CosmWasm client (used for fallback if indexer fails).
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string} rpcUrl - The RPC URL used to determine the network ID and as fallback if indexer fails.
 * @param {string} indexerUrl - Indexer URL (required, must come from environment config).
 * @returns {Promise<TreasuryGrantConfig[]>} - A promise that resolves to an array of TreasuryGrantConfig objects.
 */
export const getTreasuryGrantConfigs = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  rpcUrl: string,
  indexerUrl: string,
): Promise<TreasuryGrantConfig[]> => {
  try {
    const treasuryData = await fetchTreasuryDataFromIndexer(
      treasuryAddress,
      rpcUrl,
      indexerUrl,
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
 * Fetch grants issued to a grantee from a granter using ABCI query,
 * returning each grant's authorization directly decoded to DecodedReadableAuthorization.
 *
 * This decodes protobuf grants directly to DecodedReadableAuthorization,
 * avoiding any intermediate REST-format conversion (protobuf → REST → decoded)
 * that previously caused repeated session-invalidation bugs.
 *
 * @param {string} grantee - The address of the grantee.
 * @param {string} granter - The address of the granter.
 * @param {string} rpcUrl - RPC URL to use for fetching grants.
 * @returns {Promise<ChainGrant[]>} Decoded chain grants.
 */
export const fetchChainGrantsDecoded = async (
  grantee: string,
  granter: string,
  rpcUrl: string,
): Promise<ChainGrant[]> => {
  if (!grantee) throw new Error("Grantee address is required");
  if (!granter) throw new Error("Granter address is required");
  if (!rpcUrl) throw new Error("RPC URL is required");

  const rpcClient = await getRpcClient(rpcUrl);
  const queryClient = new QueryClient(rpcClient);
  const protobufRpcClient = createProtobufRpcClient(queryClient);
  const authzClient = new AuthzQueryClient(protobufRpcClient);

  const response = await authzClient.Grants({
    grantee,
    granter,
    msgTypeUrl: "",
  });

  return response.grants.map((grant) => ({
    granter,
    grantee,
    authorization: grant.authorization
      ? decodeAuthorization(
          grant.authorization.typeUrl,
          grant.authorization.value,
        )
      : { type: AuthorizationTypes.Unsupported as const, data: null },
    expiration: grant.expiration
      ? new Date(Number(grant.expiration.seconds) * 1000).toISOString()
      : "",
  }));
};
