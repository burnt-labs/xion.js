import { SmartAccountWithCodeId } from "./authenticator";
import type { AuthenticatorType } from "@burnt-labs/signers";

// Re-export for convenience
export type { SmartAccountWithCodeId };

export interface IndexerStrategy {
  /**
   * Fetch smart accounts for a given authenticator
   *
   * @param loginAuthenticator - The authenticator string (address, pubkey, JWT, etc.)
   * @param authenticatorType - Authenticator type. Required because the type is always known from context
   *                            (wallet connection, signer config, etc.) when checking for accounts.
   */
  fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]>;
}

/**
 * User-facing indexer configuration
 * Used by developers when configuring account discovery
 * For Subquery, codeId is derived from smartAccountContract, not provided by user
 */
export type UserIndexerConfig =
  | { type?: "numia"; url: string; authToken?: string }
  | { type: "subquery"; url: string };

/**
 * Internal indexer configuration for account strategies
 * Used internally by account discovery strategies
 * For Subquery, codeId is required (derived from smartAccountContract during conversion)
 */
export type AccountIndexerConfig =
  | { type?: "numia"; url: string; authToken?: string }
  | { type: "subquery"; url: string; codeId: number };
