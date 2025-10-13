export type GrantConfigTypeUrlsResponse = string[];

export interface TreasuryParams {
  display_url: string;
  redirect_url: string;
  icon_url: string;
}

export interface Any {
  type_url: string;
  value: string;
}

export interface GrantConfigByTypeUrl {
  allowance: Any;
  authorization: Any;
  description: string;
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
  contracts?: string[];
}

export interface FormattedDescriptions {
  parsedDescription: string;
  dappDescription: string;
}

export interface GeneratedAuthzGrantMessage {
  typeUrl: string;
  value: any; // MsgGrant from cosmjs-types
}
