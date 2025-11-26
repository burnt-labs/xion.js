/**
 * Salt calculation utilities
 * Pure cryptographic functions for calculating deterministic salts for smart account creation
 */

import { sha256 } from "@cosmjs/crypto";
import { fromHex, toHex } from "@cosmjs/encoding";
import { validateAndDecodeHex, validateEthereumAddress } from "./hex-validation";
import type { AuthenticatorType } from "../types/account";
import { AUTHENTICATOR_TYPE } from "../types/account";

/**
 * Calculate salt for EthWallet authenticator
 *
 * Salt is sha256(address_bytes) where address is the hex Ethereum address
 *
 * @param address - Ethereum address (with or without 0x prefix)
 * @returns Salt as hex string
 */
export function calculateEthWalletSalt(address: string): string {
  // Remove 0x prefix and normalize to lowercase
  // Ethereum addresses are case-insensitive (EIP-55 checksum is optional)
  const addressHex = address.replace(/^0x/i, "").toLowerCase();

  // Validate using our wrapper which uses CosmJS
  validateEthereumAddress(`0x${addressHex}`, "Ethereum address");

  // Decode hex using CosmJS (validates format)
  const addressBinary = fromHex(addressHex);

  // Calculate SHA256 hash using CosmJS
  const saltBytes = sha256(addressBinary);

  // Encode result as hex using CosmJS
  return toHex(saltBytes);
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
  // Runtime type validation for defense-in-depth
  if (!pubkey || typeof pubkey !== "string") {
    throw new Error("Public key must be a non-empty string");
  }

  // Hash the string directly (not hex-encoded)
  const saltBytes = sha256(new TextEncoder().encode(pubkey));
  return toHex(saltBytes);
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
  // Runtime type validation for defense-in-depth
  if (!jwt || typeof jwt !== "string") {
    throw new Error("JWT must be a non-empty string");
  }

  // Hash the string directly (not hex-encoded)
  const saltBytes = sha256(new TextEncoder().encode(jwt));
  return toHex(saltBytes);
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

/**
 * Convert hex salt string to Uint8Array
 * Used by AA API for address calculation with instantiate2Address
 *
 * @param hexSalt - Salt as hex string (64 hex chars = 32 bytes)
 * @returns Salt as Uint8Array
 * @throws Error if hex salt is invalid format or wrong length
 *
 * @example
 * ```typescript
 * const salt = calculateEthWalletSalt("0x1234...");
 * const saltBytes = hexSaltToUint8Array(salt);
 * // Use saltBytes with instantiate2Address
 * ```
 */
export function hexSaltToUint8Array(hexSalt: string): Uint8Array {
  // Use CosmJS-based validation and decoding
  return validateAndDecodeHex(hexSalt, "salt", { exactByteLength: 32 });
}
