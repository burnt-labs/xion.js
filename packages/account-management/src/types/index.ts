/**
 * Type definitions for account management
 *
 */

export * from "./authenticator";
export * from "./grants";
export * from "./indexer";
export * from "./treasury";

/**
 * Smart account contract configuration
 * Required for creating new smart accounts in signer mode
 */
export interface SmartAccountContractConfig {
  /** Contract code ID for smart account creation */
  codeId: number;

  /** Contract checksum as hex string */
  checksum: string;

  /** Address prefix (e.g., "xion") */
  addressPrefix: string;
}

/**
 * Account creation configuration
 * Required for creating new smart accounts when they don't exist
 * Aligned with the grouped config structure used in signer mode
 */
export interface AccountCreationConfig {
  /** AA API URL for account creation */
  aaApiUrl: string;

  /** Smart account contract configuration */
  smartAccountContract: SmartAccountContractConfig;

  /** Fee granter address (creator) */
  feeGranter: string;
}
