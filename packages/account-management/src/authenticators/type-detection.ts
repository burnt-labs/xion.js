/**
 * Authenticator type detection utilities
 * Explicitly identifies authenticator types based on format
 */

/**
 * All supported authenticator types in XION smart accounts
 */
export type AuthenticatorType =
  | "EthWallet"    // Ethereum wallets (MetaMask, Rainbow, etc.)
  | "Secp256K1"    // Cosmos wallets (Keplr, Leap, OKX, etc.)
  | "Ed25519"      // Ed25519 curve wallets (Solana, etc.)
  | "JWT"          // Social logins (Google, TikTok, etc.)
  | "Passkey"      // WebAuthn/Passkey
  | "Sr25519";     // Sr25519 curve (Polkadot, etc.)

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
export function detectAuthenticatorType(authenticator: string): AuthenticatorType {
  // JWT format: "aud.sub" (e.g., "google.com.user123")
  if (authenticator.includes(".") && !authenticator.startsWith("0x")) {
    return "JWT";
  }

  // EthWallet format: 0x-prefixed or 40-character hex
  if (authenticator.startsWith("0x") || /^[0-9a-fA-F]{40}$/i.test(authenticator)) {
    return "EthWallet";
  }

  // Passkey format: typically starts with "passkey:" or is a WebAuthn credential
  if (authenticator.startsWith("passkey:") || authenticator.includes("webauthn")) {
    return "Passkey";
  }

  // Default to Secp256K1 for base64-encoded pubkeys
  // Note: Cannot distinguish between Secp256K1/Ed25519/Sr25519 from string alone
  // These are all base64-encoded pubkeys of different lengths:
  // - Secp256K1: 33 bytes (compressed) = 44 chars base64
  // - Ed25519: 32 bytes = 43-44 chars base64
  // - Sr25519: 32 bytes = 43-44 chars base64
  // Default to Secp256K1 as it's the most common in Cosmos ecosystem
  return "Secp256K1";
}

/**
 * Determine authenticator type with additional context
 *
 * @param authenticator - The authenticator string
 * @param hint - Optional hint about the authenticator type (from contract query, etc.)
 * @returns The authenticator type
 */
export function detectAuthenticatorTypeWithHint(
  authenticator: string,
  hint?: string,
): AuthenticatorType {
  // If we have an explicit hint, use it
  if (hint) {
    const normalizedHint = hint.toLowerCase();
    if (normalizedHint.includes("ethwallet")) return "EthWallet";
    if (normalizedHint.includes("secp256k1")) return "Secp256K1";
    if (normalizedHint.includes("ed25519")) return "Ed25519";
    if (normalizedHint.includes("sr25519")) return "Sr25519";
    if (normalizedHint.includes("jwt")) return "JWT";
    if (normalizedHint.includes("passkey")) return "Passkey";
  }

  // Fall back to format detection
  return detectAuthenticatorType(authenticator);
}

/**
 * Check if authenticator is a specific type
 */
export function isEthWallet(authenticator: string): boolean {
  return detectAuthenticatorType(authenticator) === "EthWallet";
}

export function isJWT(authenticator: string): boolean {
  return detectAuthenticatorType(authenticator) === "JWT";
}

export function isPasskey(authenticator: string): boolean {
  return detectAuthenticatorType(authenticator) === "Passkey";
}

export function isSecp256k1(authenticator: string): boolean {
  return detectAuthenticatorType(authenticator) === "Secp256K1";
}
