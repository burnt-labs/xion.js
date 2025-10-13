import { Authenticator } from "../indexer-strategies/types";
import { SmartAccountWithCodeId } from "../indexer-strategies/types";

/**
 * Checks if an authenticator already exists in the list
 * @param authenticators - List of existing authenticators
 * @param identifier - The authenticator identifier to check (e.g., "aud.sub" for JWT)
 * @param type - The type of authenticator (e.g., "Jwt")
 * @returns true if a duplicate exists, false otherwise
 */
export function isDuplicateAuthenticator(
  authenticators: Authenticator[],
  identifier: string,
  type: string,
): boolean {
  return authenticators.some(
    (auth) => auth.authenticator === identifier && auth.type === type,
  );
}

/**
 * Deduplicates accounts by their ID
 * @param accounts - List of accounts that may contain duplicates
 * @returns List of unique accounts
 */
export function deduplicateAccountsById(
  accounts: SmartAccountWithCodeId[] | undefined,
): SmartAccountWithCodeId[] {
  if (!accounts) return [];

  const seen = new Set<string>();
  return accounts.filter((account) => {
    if (seen.has(account.id)) {
      return false;
    }
    seen.add(account.id);
    return true;
  });
}

/**
 * Finds the best matching authenticator from a list
 * When multiple authenticators match, returns the one with the lowest index
 * @param authenticators - List of authenticators to search
 * @param loginAuthenticator - The authenticator identifier to match
 * @returns The best matching authenticator or null if none found
 */
export function findBestMatchingAuthenticator(
  authenticators: Authenticator[],
  loginAuthenticator: string,
): Authenticator | null {
  const matchingAuthenticators = authenticators.filter(
    (auth) => auth.authenticator === loginAuthenticator,
  );

  if (matchingAuthenticators.length === 0) {
    return null;
  }

  // Return the one with the lowest index (likely the original)
  return matchingAuthenticators.reduce((prev, curr) =>
    prev.authenticatorIndex < curr.authenticatorIndex ? prev : curr,
  );
}

/**
 * Validates if a new authenticator can be added
 * @param authenticators - List of existing authenticators
 * @param identifier - The new authenticator identifier
 * @param type - The type of authenticator
 * @returns Object with isValid flag and error message if invalid
 */
export function validateNewAuthenticator(
  authenticators: Authenticator[],
  identifier: string,
  type: string,
): { isValid: boolean; errorMessage?: string } {
  if (isDuplicateAuthenticator(authenticators, identifier, type)) {
    const errorMessage =
      type === "Jwt"
        ? "This email is already added as an authenticator"
        : "This authenticator is already added to your account";
    return { isValid: false, errorMessage };
  }

  return { isValid: true };
}
