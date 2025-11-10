/**
 * Salt calculation utilities
 * Pure cryptographic functions for calculating deterministic salts for smart account creation
 */

import { sha256 } from "@cosmjs/crypto";
import { Buffer } from "buffer";

/**
 * Authenticator type constants
 * Use these instead of string literals to avoid typos and ensure type safety
 */
export const AUTHENTICATOR_TYPE = {
  EthWallet: "EthWallet" as const,      // Ethereum wallets (MetaMask, Rainbow, etc.)
  Secp256K1: "Secp256K1" as const,      // Cosmos wallets (Keplr, Leap, OKX, etc.)
  Ed25519: "Ed25519" as const,          // Ed25519 curve wallets (Solana, etc.)
  JWT: "JWT" as const,                  // Social logins (Google, Stytch, etc.)
  Passkey: "Passkey" as const,          // WebAuthn/Passkey
  Sr25519: "Sr25519" as const,          // Sr25519 curve (Polkadot, etc.)
} as const;

/**
 * Authenticator types that support salt calculation
 * Used to determine which salt calculation method to use
 */
export type AuthenticatorType = typeof AUTHENTICATOR_TYPE[keyof typeof AUTHENTICATOR_TYPE];

/**
 * Calculate salt for EthWallet authenticator
 *
 * Salt is sha256(address_bytes) where address is the hex Ethereum address
 *
 * @param address - Ethereum address (with or without 0x prefix)
 * @returns Salt as hex string
 */
export function calculateEthWalletSalt(address: string): string {
  const addressHex = address.replace(/^0x/, "");
  const addressBinary = Buffer.from(addressHex, "hex");
  const saltBytes = sha256(addressBinary);
  return Buffer.from(saltBytes).toString("hex");
}

/**
 * Calculate salt for Secp256k1 authenticator
 *
 * Salt is sha256(pubkey_string) where pubkey is the hex public key
 *
 * @param pubkey - Secp256k1 public key as hex string
 * @returns Salt as hex string
 */
export function calculateSecp256k1Salt(pubkey: string): string {
  const saltBytes = sha256(Buffer.from(pubkey));
  return Buffer.from(saltBytes).toString("hex");
}

/**
 * Calculate salt for JWT authenticator
 *
 * Salt is sha256(jwt_string) where jwt is the JWT token or identifier
 *
 * @param jwt - JWT token or identifier (e.g., "aud.sub" format)
 * @returns Salt as hex string
 */
export function calculateJWTSalt(jwt: string): string {
  const saltBytes = sha256(Buffer.from(jwt));
  return Buffer.from(saltBytes).toString("hex");
}

/**
 * Calculate salt based on authenticator type
 *
 * @param authenticatorType - Type of authenticator
 * @param credential - Authenticator credential (address, pubkey, JWT, etc.)
 * @returns Salt as hex string
 */
export function calculateSalt(
  authenticatorType: AuthenticatorType,
  credential: string,
): string {
  switch (authenticatorType) {
    case AUTHENTICATOR_TYPE.EthWallet:
    return calculateEthWalletSalt(credential);
    case AUTHENTICATOR_TYPE.Secp256K1:
      return calculateSecp256k1Salt(credential);
    case AUTHENTICATOR_TYPE.JWT:
      return calculateJWTSalt(credential);
    case AUTHENTICATOR_TYPE.Passkey:
    case AUTHENTICATOR_TYPE.Ed25519:
    case AUTHENTICATOR_TYPE.Sr25519:
      // For now, these use the same salt calculation as Secp256K1
      // (sha256 of the credential string)
      // Can be extended with specific implementations later
    return calculateSecp256k1Salt(credential);
    default:
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = authenticatorType;
      throw new Error(`Unsupported authenticator type: ${_exhaustive}`);
  }
}
