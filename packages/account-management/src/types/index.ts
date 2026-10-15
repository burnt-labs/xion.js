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
 *
 * Smart-account addresses come from the AA API; neither `codeId` nor
 * `addressPrefix` selects the address.
 */
export interface SmartAccountContractConfig {
  /** Contract code ID of the smart account contract */
  codeId: number;

  /**
   * @deprecated Ignored. The AA API selects smart-account addresses, so no
   * contract checksum is needed. Kept optional for source compatibility.
   */
  checksum?: string;

  /** Address prefix (e.g., "xion"); returned addresses must use it */
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

  /** Fee granter address (used for grants; not an address-derivation input) */
  feeGranter: string;
}
