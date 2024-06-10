export interface AuthenticatorNode {
  _typename: string;
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
  version: string;
}

export function findLowestMissingOrNextIndex(
  authenticators?: AuthenticatorNode[],
) {
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
