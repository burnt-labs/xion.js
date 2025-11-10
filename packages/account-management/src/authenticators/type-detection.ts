/**
 * Authenticator type detection utilities
 * Explicitly identifies authenticator types based on format
 *
 * ---- ONLY USED AS BACKUP FOR, ALL QUERIES HAVE CASTED TYPES WITH AUTHENTICATOR_TYPE FROM @burnt-labs/signers ----
 */

import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";

// Re-export AuthenticatorType for use in other modules
export type { AuthenticatorType };

/**
 * Explicitly determine authenticator type from the authenticator string
 *
 * @param authenticator - The authenticator string (address, pubkey, JWT, etc.)
 * @returns The authenticator type
 *
 * Format detection rules:
 * - JWT: Contains a dot (aud.sub format)
 * - EthWallet: Starts with 0x or is 40-char hex
 * - Passkey: Starts with "passkey:" or contains WebAuthn credential format
 * - Secp256K1/Ed25519/Sr25519: Base64-encoded pubkeys (need additional context)
 */
export function detectAuthenticatorType(
  authenticator: string,
): AuthenticatorType {
  // JWT format: "aud.sub" (e.g., "google.com.user123")
  if (authenticator.includes(".") && !authenticator.startsWith("0x")) {
    return AUTHENTICATOR_TYPE.JWT;
  }

  // EthWallet format: 0x-prefixed or 40-character hex
  if (
    authenticator.startsWith("0x") ||
    /^[0-9a-fA-F]{40}$/i.test(authenticator)
  ) {
    return AUTHENTICATOR_TYPE.EthWallet;
  }

  // Passkey format: typically starts with "passkey:" or is a WebAuthn credential
  if (
    authenticator.startsWith("passkey:") ||
    authenticator.includes("webauthn")
  ) {
    return AUTHENTICATOR_TYPE.Passkey;
  }

  // Default to Secp256K1 for base64-encoded pubkeys
  // Note: Cannot distinguish between Secp256K1/Ed25519/Sr25519 from string alone
  // These are all base64-encoded pubkeys of different lengths:
  // - Secp256K1: 33 bytes (compressed) = 44 chars base64
  // - Ed25519: 32 bytes = 43-44 chars base64
  // - Sr25519: 32 bytes = 43-44 chars base64
  // Default to Secp256K1 as it's the most common in Cosmos ecosystem
  return AUTHENTICATOR_TYPE.Secp256K1;
}
