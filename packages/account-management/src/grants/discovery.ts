/**
 * Treasury discovery utilities
 * Queries treasury contracts to discover and format permissions for display
 * Similar pattern to accounts/discovery.ts
 */

import { decodeAuthorization } from "@burnt-labs/abstraxion-core";
import type { TreasuryStrategy } from "../types/treasury";
import type {
  PermissionDescription,
  DecodedReadableAuthorization,
} from "./utils/format-permissions";
import { generatePermissionDescriptions } from "./utils/format-permissions";

/**
 * Minimal interface for blockchain client with smart contract query capability
 * This avoids circular dependency with @burnt-labs/signers
 */
export interface ContractQueryClient {
  queryContractSmart(
    address: string,
    queryMsg: Record<string, unknown>,
  ): Promise<unknown>;
  getChainId(): Promise<string>;
}

export interface TreasuryContractResponse {
  permissionDescriptions: PermissionDescription[];
  params: {
    redirect_url: string;
    icon_url: string;
    metadata: string; // Note: Contract field is "metadata", but some indexers may return "display_url"
  };
}

/**
 * Queries the DAPP treasury contract to parse and display requested permissions to end user
 * @param contractAddress - The address for the deployed treasury contract instance
 * @param client - Client to query RPC (must have queryContractSmart method)
 * @param account - Users account address
 * @param strategy - Treasury strategy to use for querying
 * @param usdcDenom - Optional USDC denom for formatting (network-specific)
 * @returns The human-readable permission descriptions and treasury parameters
 */
export async function queryTreasuryContractWithPermissions(
  contractAddress: string,
  client: ContractQueryClient,
  account: string,
  strategy: TreasuryStrategy,
  usdcDenom?: string,
): Promise<TreasuryContractResponse> {
  if (!contractAddress) {
    throw new Error("Missing contract address");
  }

  if (!client) {
    throw new Error("Missing client");
  }

  if (!account) {
    throw new Error("Missing account");
  }

  if (!strategy) {
    throw new Error("Missing treasury strategy");
  }

  // Fetch treasury configuration using the strategy
  const treasuryConfig = await strategy.fetchTreasuryConfig(
    contractAddress,
    client,
  );

  if (!treasuryConfig) {
    throw new Error(
      "Something went wrong querying the treasury contract for grants",
    );
  }

  // Process grant configurations
  const decodedGrantsWithDappDescription: (DecodedReadableAuthorization & {
    dappDescription: string;
  })[] = treasuryConfig.grantConfigs.map((grantConfig) => {
    return {
      ...decodeAuthorization(
        grantConfig.authorization.type_url,
        grantConfig.authorization.value,
      ),
      dappDescription: grantConfig.description,
    };
  });

  // Generate human-readable permission descriptions
  const permissionDescriptions = generatePermissionDescriptions(
    decodedGrantsWithDappDescription,
    account,
    usdcDenom,
  );

  return {
    permissionDescriptions,
    params: treasuryConfig.params,
  };
}
