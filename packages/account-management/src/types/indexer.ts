import { SmartAccountWithCodeId } from "./authenticator";
import type { AuthenticatorType } from "../authenticators/type-detection";

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
