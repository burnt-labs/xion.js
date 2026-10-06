/**
 * Account discovery utilities
 * Functions for checking if smart accounts exist
 */

import { fromBase64, fromHex } from "@cosmjs/encoding";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import type { CompositeAccountStrategy } from "../accounts/index";
import type { Authenticator } from "../types/authenticator";

/**
 * Authenticator types whose accounts are verified on chain and matched by
 * type and normalized identifier. A missing match for these types is an
 * error, never a silent default to authenticator index 0.
 */
const VERIFIED_AUTHENTICATOR_TYPES: ReadonlySet<string> = new Set([
  AUTHENTICATOR_TYPE.EthWallet,
  AUTHENTICATOR_TYPE.Secp256K1,
]);

function canonicalEthereumAddress(value: string): string {
  const lowered = value.trim().toLowerCase();
  return lowered.startsWith("0x") ? lowered : `0x${lowered}`;
}

function secp256k1KeyBytes(value: string): Uint8Array | null {
  const trimmed = value.trim();
  try {
    if (/^(0[23][0-9a-fA-F]{64}|04[0-9a-fA-F]{128})$/.test(trimmed)) {
      return fromHex(trimmed);
    }
    return fromBase64(trimmed);
  } catch {
    return null;
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Whether an on-chain/indexed authenticator is the login authenticator.
 *
 * - type must match (type names compared case-insensitively)
 * - EthWallet: Ethereum addresses compared case-insensitively
 * - Secp256K1: public keys compared by decoded bytes (hex or base64), so
 *   base64 is never lowercased; undecodable values must match exactly
 */
export function isMatchingAuthenticator(
  authenticator: Pick<Authenticator, "type" | "authenticator">,
  loginAuthenticator: string,
  authenticatorType: AuthenticatorType,
): boolean {
  if (
    typeof authenticator?.authenticator !== "string" ||
    typeof loginAuthenticator !== "string" ||
    String(authenticator.type).toLowerCase() !==
      String(authenticatorType).toLowerCase()
  ) {
    return false;
  }

  if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
    return (
      canonicalEthereumAddress(authenticator.authenticator) ===
      canonicalEthereumAddress(loginAuthenticator)
    );
  }

  if (authenticatorType === AUTHENTICATOR_TYPE.Secp256K1) {
    const onChain = secp256k1KeyBytes(authenticator.authenticator);
    const login = secp256k1KeyBytes(loginAuthenticator);
    if (onChain && login) {
      return bytesEqual(onChain, login);
    }
    return authenticator.authenticator.trim() === loginAuthenticator.trim();
  }

  return (
    authenticator.authenticator.toLowerCase() ===
    loginAuthenticator.toLowerCase()
  );
}

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

    if (VERIFIED_AUTHENTICATOR_TYPES.has(authenticatorType)) {
      // Match by type and normalized identifier. An account without the login
      // authenticator is an inconsistency, not index 0 and not "no account".
      const matchingAuthenticator = existingAccount.authenticators.find(
        (auth: Authenticator) =>
          isMatchingAuthenticator(auth, authenticator, authenticatorType),
      );

      if (!matchingAuthenticator) {
        return {
          exists: false,
          accounts: [],
          error: `Smart account ${existingAccount.id} has no ${authenticatorType} authenticator matching the login authenticator`,
        };
      }

      return {
        exists: true,
        accounts,
        smartAccountAddress: existingAccount.id,
        codeId: existingAccount.codeId,
        authenticatorIndex: matchingAuthenticator.authenticatorIndex,
      };
    }

    // Other authenticator types (JWT, Passkey, ...): unchanged legacy matching
    const matchingAuthenticator = existingAccount.authenticators.find(
      (auth: Authenticator) => {
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
