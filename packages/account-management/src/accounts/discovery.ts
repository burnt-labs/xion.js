/**
 * Account discovery utilities
 * Functions for checking if smart accounts exist
 */

import type { CompositeAccountStrategy } from "../accounts/index";
import type { Authenticator } from "../types/authenticator";
import type { AuthenticatorType } from "@burnt-labs/signers";

/**
 * Result of account existence check
 */
export interface AccountExistenceResult {
  exists: boolean;
  accounts: any[];
  smartAccountAddress?: string;
  codeId?: number;
  authenticatorIndex?: number;
  error?: string; // Error message if account check failed (distinguishes from "not found")
}

/**
 * Check if account exists using the account strategy
 * Returns account details if found
 *
 * @param accountStrategy - The account strategy to use for discovery
 * @param authenticator - The authenticator string (address, pubkey, JWT, etc.)
 * @param authenticatorType - Authenticator type. Required because the type is always known from context
 *                            (wallet connection, signer config, etc.) when checking for accounts.
 */
export async function checkAccountExists(
  accountStrategy: CompositeAccountStrategy,
  authenticator: string,
  authenticatorType: AuthenticatorType,
): Promise<AccountExistenceResult> {
  try {
    const accounts = await accountStrategy.fetchSmartAccounts(
      authenticator,
      authenticatorType,
    );

    if (accounts.length === 0) {
      return {
        exists: false,
        accounts: [],
      };
    }

    const existingAccount = accounts[0];

    // Find the matching authenticator index
    const matchingAuthenticator = existingAccount.authenticators.find(
      (auth: Authenticator) => {
        // For EthWallet, compare lowercase addresses
        // For Secp256K1, compare base64 pubkeys
        return auth.authenticator.toLowerCase() === authenticator.toLowerCase();
      },
    );

    const authenticatorIndex = matchingAuthenticator?.authenticatorIndex ?? 0;

    return {
      exists: true,
      accounts,
      smartAccountAddress: existingAccount.id,
      codeId: existingAccount.codeId,
      authenticatorIndex,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      exists: false,
      accounts: [],
      error: errorMessage,
    };
  }
}
