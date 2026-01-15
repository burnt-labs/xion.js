/**
 * Creates a JWT authenticator identifier from audience and subject
 * @param aud - The audience claim from JWT
 * @param sub - The subject claim from JWT
 * @returns Formatted authenticator identifier
 */
export function createJwtAuthenticatorIdentifier(
  aud: string | string[] | undefined,
  sub: string | undefined,
): string {
  const formattedAud = Array.isArray(aud) ? aud[0] : aud;
  return `${formattedAud}.${sub}`;
}
