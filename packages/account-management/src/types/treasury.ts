import type {
  GrantConfig,
  TreasuryAny,
  Params,
} from "@burnt-labs/xion-types";

export type GrantConfigTypeUrlsResponse = string[];

/**
 * Treasury parameters returned from treasury contract.
 * Note: The on-chain contract currently returns `redirect_url` (singular string)
 * while the latest contract schema (xion-types Params) has `redirect_urls` (array)
 * and `display_url`. This local type matches the deployed contract response shape.
 * Once the chain upgrades, this should be replaced with `Params` from xion-types.
 */
export interface TreasuryParams {
  redirect_url: string;
  icon_url: string;
  metadata: string;
}

/** Re-export the canonical Params type from xion-types for forward compatibility */
export type { Params as TreasuryParamsV2 };

/**
 * Grant configuration with additional fields for UI display
 * Extends the base GrantConfig from xion-types with fee grant fields
 */
export interface GrantConfigByTypeUrl extends GrantConfig {
  // Additional fields for fee grants (not from treasury contract directly)
  allowance?: TreasuryAny;
  maxDuration?: number;
}

/**
 * Represents the complete treasury configuration including grant configs and parameters
 */
export interface TreasuryConfig {
  grantConfigs: GrantConfigByTypeUrl[];
  params: TreasuryParams;
}

/**
 * Strategy interface for fetching treasury configurations
 * Different strategies can fetch from different sources (indexer, direct query, etc.)
 */
export interface TreasuryStrategy {
  /**
   * Fetch treasury configuration for a given contract address
   * @param treasuryAddress The treasury contract address
   * @param client The Cosmos client for querying chain data (must have queryContractSmart method)
   * @returns Treasury configuration
   * @throws Error if treasury config not found or fetch fails
   */
  fetchTreasuryConfig(
    treasuryAddress: string,
    client: any, // AAClient from @burnt-labs/signers (avoiding circular dependency)
  ): Promise<TreasuryConfig>;
}

export interface PermissionDescription {
  authorizationDescription: string;
  dappDescription?: string;
  contracts?: (string | undefined)[];
}

export interface FormattedDescriptions {
  parsedDescription: string;
  dappDescription: string;
}

export interface GeneratedAuthzGrantMessage {
  typeUrl: string;
  value: any; // MsgGrant from cosmjs-types
}
