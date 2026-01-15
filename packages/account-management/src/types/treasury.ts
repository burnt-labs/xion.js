export type GrantConfigTypeUrlsResponse = string[];

/**
 * Treasury parameters returned from treasury contract
 * Matches the Params struct in contracts/contracts/treasury/src/state.rs
 */
export interface TreasuryParams {
  redirect_url: string;
  icon_url: string;
  metadata: string;
}

export interface Any {
  type_url: string;
  value: string;
}

/**
 * Grant configuration with additional fields for UI display
 * Extended from TreasuryGrantConfig with extra fields like allowance for fee grants
 */
export interface GrantConfigByTypeUrl {
  authorization: Any;
  description: string;
  optional: boolean;
  // Additional fields for fee grants (not from treasury contract directly)
  allowance?: Any;
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
   * @returns Treasury configuration or null if not found/failed
   */
  fetchTreasuryConfig(
    treasuryAddress: string,
    client: any, // AAClient from @burnt-labs/signers (avoiding circular dependency)
  ): Promise<TreasuryConfig | null>;
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
