import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl as AuthzQueryClient } from "cosmjs-types/cosmos/authz/v1beta1/query";
import type { GrantsResponse, TreasuryGrantConfig } from "@/types";
import { getRpcClient } from "@/utils/rpcClient";

/**
 * Retrieves the type URLs for the treasury contract.
 *
 * @param {CosmWasmClient} client - The CosmWasm client to interact with the blockchain.
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @returns {Promise<string[]>} - A promise that resolves to an array of type URLs.
 */
export const getTreasuryContractTypeUrls = async (
  client: CosmWasmClient,
  treasuryAddress: string,
): Promise<string[]> => {
  const queryTreasuryContractMsg = { grant_config_type_urls: {} };
  return await client.queryContractSmart(
    treasuryAddress,
    queryTreasuryContractMsg,
  );
};

/**
 * Retrieves the treasury grant configurations by type URL.
 *
 * @param {CosmWasmClient} client - The CosmWasm client to interact with the blockchain.
 * @param {string} treasuryAddress - The address of the treasury contract.
 * @param {string[]} typeUrls - An array of type URLs to query.
 * @returns {Promise<TreasuryGrantConfig[]>} - A promise that resolves to an array of TreasuryGrantConfig objects.
 */
export const getTreasuryContractConfigsByTypeUrl = async (
  client: CosmWasmClient,
  treasuryAddress: string,
  account: string,
  typeUrls: string[],
): Promise<TreasuryGrantConfig[]> => {
  const treasuryGrantConfigs: TreasuryGrantConfig[] = [];
  for (const typeUrl of typeUrls) {
    const queryByMsg = {
      grant_config_by_type_url: { msg_type_url: typeUrl, account_address: account },
    };
    const grantConfigResponse: TreasuryGrantConfig =
      await client.queryContractSmart(treasuryAddress, queryByMsg);
    treasuryGrantConfigs.push(grantConfigResponse);
  }

  return treasuryGrantConfigs;
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
