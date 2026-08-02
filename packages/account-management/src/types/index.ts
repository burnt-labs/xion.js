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

  /**
   * Wasm code id to register NEW accounts at. Omit to let the AA API use its
   * own configured default.
   *
   * When set it is forwarded verbatim; the AA API validates it against the
   * chain's `x/abstractaccount` `allowed_code_ids` fail-closed, so the client
   * does not pre-check it. It MUST correspond to
   * `smartAccountContract.checksum`, or the local CREATE2 derivation will not
   * match the one the API verifies and the request is rejected with an
   * explicit checksum-mismatch error.
   *
   * Deliberately separate from `smartAccountContract.codeId`: that field
   * describes an already-deployed contract for account *discovery* (it is the
   * Subquery indexer's code-id filter). Promoting it to a registration target
   * would silently change where every existing consumer registers — and, since
   * the allow-list check is fail-closed, would break signup for anyone whose
   * discovery code id is not registerable. Registration targeting is opt-in.
   */
  codeId?: string;
}
