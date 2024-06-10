export interface AuthenticatorNode {
  _typename: string;
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
  version: string;
}

/**
 * Returns the lowest missing or next index
 *
 * @returns {number} - Returns the lowest missing or next index.
 * @throws {Error} - If authenticators array is null or undefined.
 */
export function findLowestMissingOrNextIndex(
  authenticators?: AuthenticatorNode[],
): number {
  if (!authenticators) {
    throw new Error("Missing authenticators");
  }

  const indexSet = new Set(
    authenticators.map((authenticator) => authenticator.authenticatorIndex),
  );

  for (let i = 0; i <= indexSet.size; i++) {
    if (!indexSet.has(i)) {
      return i;
    }
  }

  return indexSet.size;
}
