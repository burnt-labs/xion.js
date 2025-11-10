/**
 * Treasury discovery utilities
 * Queries treasury contracts to discover and format permissions for display
 * Similar pattern to accounts/discovery.ts
 */

import { decodeAuthorization } from "@burnt-labs/abstraxion-core";
import type { TreasuryStrategy } from "../types/treasury";
import type { PermissionDescription } from "./utils/format-permissions";
import { generatePermissionDescriptions } from "./utils/format-permissions";

export interface TreasuryContractResponse {
  permissionDescriptions: PermissionDescription[];
  params: {
    display_url: string;
    redirect_url: string;
    icon_url: string;
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
  client: any, // AAClient from @burnt-labs/signers
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
  const decodedGrantsWithDappDescription = treasuryConfig.grantConfigs.map(
    (grantConfig) => {
      return {
        ...decodeAuthorization(
          grantConfig.authorization.type_url,
          grantConfig.authorization.value,
        ),
        dappDescription: grantConfig.description,
      };
    },
  );

  // Generate human-readable permission descriptions
  const permissionDescriptions = generatePermissionDescriptions(
    decodedGrantsWithDappDescription as any,
    account,
    usdcDenom,
  );

  return {
    permissionDescriptions,
    params: treasuryConfig.params,
  };
}
