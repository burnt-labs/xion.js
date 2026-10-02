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

  /**
   * Optional pin for the address derivation checksum (hex).
   *
   * Addresses are derived from the chain's x/abstractaccount
   * `address_derivation_hash`, read over RPC and cached per chain. When this
   * is set and disagrees with the chain, discovery and creation fail with an
   * `AddressDerivationMismatchError` rather than derive a wrong address. It is
   * used on its own only when the chain has no derivation hash (pre-v31) or
   * cannot be reached.
   */
  checksum?: string;

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
