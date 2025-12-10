/**
 * Credential validation utilities
 * Pure validation functions for authenticator credentials
 */

import type { AuthenticatorType } from "../types/account";
import { ETH_ADDRESS_PATTERN } from "./hex-validation";

/**
 * Check if a string is a valid JWT token
 *
 * Validates the structure of a JWT token:
 * - Must have exactly 3 parts separated by dots (header.payload.signature)
 * - All parts must be base64url encoded (alphanumeric, hyphen, underscore)
 * - Header and payload must be at least 10 characters each
 *
 * @param str - String to validate
 * @returns True if valid JWT token format
 */
export function isJWTToken(str: string): boolean {
  const parts = str.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;

  // Check that all parts exist and are base64url encoded
  if (!header || !payload || !signature) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(header)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(signature)) return false;

  // Additional check: header and payload should have reasonable length (at least 10 chars)
  if (header.length < 10 || payload.length < 10) return false;

  return true;
}

/**
 * Check if a string is a valid Ethereum address
 *
 * Validates the format:
 * - Must start with "0x"
 * - Followed by exactly 40 hexadecimal characters
 *
 * @param str - String to validate
 * @returns True if valid Ethereum address format
 */
export function isEthereumAddress(str: string): boolean {
  return ETH_ADDRESS_PATTERN.test(str);
}

/**
 * Check if a string is a valid Secp256K1 public key
 *
 * Supports three formats:
 * - Base64-encoded compressed key (44 chars, starts with 'A')
 * - Hex-encoded compressed key (66 chars, starts with 02 or 03)
 * - Hex-encoded uncompressed key (130 chars, starts with 04)
 *
 * Primary format: /cosmos.crypto.secp256k1.PubKey (base64-encoded, compressed, 33 bytes)
 *
 * @param str - String to validate
 * @returns True if valid Secp256K1 public key format
 */
export function isSecp256k1PublicKey(str: string): boolean {
  // Check base64 format first (primary use case for /cosmos.crypto.secp256k1.PubKey)
  // Must actually validate it's decodable, not just pattern matching
  if (/^A[A-Za-z0-9+\/]{43}$/.test(str)) {
    try {
      const decoded = Buffer.from(str, "base64");
      // Must decode to 33 or 65 bytes for valid secp256k1 key
      return decoded.length === 33 || decoded.length === 65;
    } catch {
      return false;
    }
  }

  // Compressed: 66 hex characters starting with 02 or 03
  const isCompressed = /^0[23][0-9a-fA-F]{64}$/.test(str);
  // Uncompressed: 130 hex characters starting with 04
  const isUncompressed = /^04[0-9a-fA-F]{128}$/.test(str);

  return isCompressed || isUncompressed;
}

/**
 * Detect the authenticator type from a credential string
 *
 * Auto-detects the type based on format validation.
 * Priority order: JWT > Ethereum > Secp256k1
 *
 * @param credential - Credential string to analyze
 * @returns Detected authenticator type, or null if unrecognized
 */
export function detectAuthenticatorType(
  credential: string,
): AuthenticatorType | null {
  const trimmedCredential = credential.trim();

  // Check in priority order
  if (isJWTToken(trimmedCredential)) {
    return "JWT";
  }
  if (isEthereumAddress(trimmedCredential)) {
    return "EthWallet";
  }
  if (isSecp256k1PublicKey(trimmedCredential)) {
    return "Secp256K1";
  }

  return null;
}
