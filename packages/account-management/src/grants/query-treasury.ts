/**
 * Treasury contract querying utilities
 * Extracted from dashboard utils/query-treasury-contract.ts
 */

import type { TreasuryStrategy } from "./strategies/types";
import type { TreasuryParams } from "../types/treasury";
import type { AAClient } from "../types/client";

export interface GrantConfigWithDescription {
  authorization: {
    type_url: string;
    value: string; // base64 encoded
  };
  description: string;
  allowance?: {
    type_url: string;
    value: string;
  };
  maxDuration?: number;
}

export interface TreasuryQueryResult {
  grantConfigs: GrantConfigWithDescription[];
  params: TreasuryParams;
}

/**
 * Queries a treasury contract using the provided strategy
 *
 * @param contractAddress - The treasury contract address
 * @param client - CosmWasm client for querying
 * @param strategy - Treasury strategy to use for querying
 * @returns Treasury configuration with grant configs and params
 * @throws Error if required parameters are missing or query fails
 */
export async function queryTreasuryContract(
  contractAddress: string,
  client: AAClient,
  strategy: TreasuryStrategy,
): Promise<TreasuryQueryResult> {
  if (!contractAddress) {
    throw new Error("Missing contract address");
  }

  if (!client) {
    throw new Error("Missing client");
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
      "Failed to fetch treasury configuration - strategy returned null",
    );
  }

  return {
    grantConfigs: treasuryConfig.grantConfigs,
    params: treasuryConfig.params,
  };
}

/**
 * Queries treasury parameters only (without grant configs)
 *
 * @param contractAddress - The treasury contract address
 * @param client - CosmWasm client for querying
 * @returns Treasury parameters (display_url, redirect_url, icon_url)
 */
export async function queryTreasuryParams(
  contractAddress: string,
  client: AAClient,
): Promise<TreasuryParams> {
  const queryParams = { params: {} };
  const params = (await client.queryContractSmart(
    contractAddress,
    queryParams,
  )) as TreasuryParams;

  return params;
}
