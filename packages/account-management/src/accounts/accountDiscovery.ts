/**
 * Account discovery utilities
 * Functions for checking if smart accounts exist
 */

import type { CompositeAccountStrategy } from '../accounts/index';
import type { Authenticator } from '../types/authenticator';

/**
 * Result of account existence check
 */
export interface AccountExistenceResult {
  exists: boolean;
  accounts: any[];
  smartAccountAddress?: string;
  codeId?: number;
  authenticatorIndex?: number;
}

/**
 * Check if account exists using the account strategy
 * Returns account details if found
 */
export async function checkAccountExists(
  accountStrategy: CompositeAccountStrategy,
  authenticator: string,
  logPrefix: string = '[account-discovery]'
): Promise<AccountExistenceResult> {
  try {
    const accounts = await accountStrategy.fetchSmartAccounts(authenticator);

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
      }
    );

    const authenticatorIndex = matchingAuthenticator?.authenticatorIndex ?? 0;

    console.log(`${logPrefix} ✅ Found existing account:`, {
      smartAccount: existingAccount.id,
      codeId: existingAccount.codeId,
      authenticators: existingAccount.authenticators.length,
      authenticatorIndex,
    });

    return {
      exists: true,
      accounts,
      smartAccountAddress: existingAccount.id,
      codeId: existingAccount.codeId,
      authenticatorIndex,
    };
  } catch (error) {
    console.warn(`${logPrefix} Error checking account exists:`, error);
    return {
      exists: false,
      accounts: [],
    };
  }
}

