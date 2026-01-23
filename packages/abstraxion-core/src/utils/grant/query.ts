import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as AuthzQueryClient } from "cosmjs-types/cosmos/authz/v1beta1/query";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import type { Any } from "cosmjs-types/google/protobuf/any";
import type { GrantsResponse, TreasuryGrantConfig } from "@/types";
import { fetchConfig, getRpcClient } from "@/utils";
import { CacheManager } from "@/utils/cache/CacheManager";
import { validateTreasuryIndexerResponse } from "./validation";
import { fetchFromDaoDaoIndexer } from "../indexer/treasury-indexer";

/**
 * Maps StakeAuthorization type enum to string representation
 */
const STAKE_AUTHORIZATION_TYPE_MAP: Record<number, string> = {
  0: "AUTHORIZATION_TYPE_UNSPECIFIED",
  1: "AUTHORIZATION_TYPE_DELEGATE",
  2: "AUTHORIZATION_TYPE_UNDELEGATE",
  3: "AUTHORIZATION_TYPE_REDELEGATE",
};

/**
 * Decodes a protobuf Any authorization and formats it like REST API JSON
 */
function decodeAuthorizationToRestFormat(
  authorization: Any,
): Record<string, unknown> {
  const typeUrl = authorization.typeUrl;
  const value = authorization.value;

  try {
    switch (typeUrl) {
      case "/cosmos.authz.v1beta1.GenericAuthorization": {
        const decoded = GenericAuthorization.decode(value);
        return {
          "@type": typeUrl,
          msg: decoded.msg,
        };
      }
      case "/cosmos.bank.v1beta1.SendAuthorization": {
        const decoded = SendAuthorization.decode(value);
        return {
          "@type": typeUrl,
          spend_limit: decoded.spendLimit.map((coin) => ({
            denom: coin.denom,
            amount: coin.amount,
          })),
          allow_list: decoded.allowList || [],
        };
      }
      case "/cosmos.staking.v1beta1.StakeAuthorization": {
        const decoded = StakeAuthorization.decode(value);
        return {
          "@type": typeUrl,
          max_tokens: decoded.maxTokens
            ? {
                denom: decoded.maxTokens.denom,
                amount: decoded.maxTokens.amount,
              }
            : null,
          authorization_type:
            STAKE_AUTHORIZATION_TYPE_MAP[decoded.authorizationType] ||
            `AUTHORIZATION_TYPE_${decoded.authorizationType}`,
          allow_list: decoded.allowList?.address || [],
          deny_list: decoded.denyList?.address || [],
        };
      }
      default:
        // For unsupported types, return raw format with @type
        return {
          "@type": typeUrl,
          value: authorization.value,
        };
    }
  } catch (error) {
    // If decoding fails, return raw format
    console.warn(`Failed to decode authorization ${typeUrl}:`, error);
    return {
      "@type": typeUrl,
      value: authorization.value,
    };
  }
}

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
      console.debug(
        `Fetching treasury data from indexer for ${treasuryAddress}`,
      );

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
    // Decode protobuf authorization to REST API JSON format for compatibility with legacy compare functions
    const grantsResponse: GrantsResponse = {
      grants: response.grants.map((grant) => ({
        granter: granter,
        grantee: grantee,
        authorization: grant.authorization
          ? decodeAuthorizationToRestFormat(grant.authorization)
          : {},
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
