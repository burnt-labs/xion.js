/**
 * Salt calculation utilities for XION abstract accounts
 *
 * Deterministic salt calculation for CREATE2 address derivation.
 * Must remain consistent with AA-API and smart contracts.
 *
 * @see ./README.md for detailed specifications and cross-repository references
 */

import { sha256 } from "@cosmjs/crypto";
import { fromHex, toHex } from "@cosmjs/encoding";
import {
  validateAndDecodeHex,
  validateEthereumAddress,
  normalizeHexPrefix,
} from "./hex-validation";
import type { AuthenticatorType } from "../types/account";
import { AUTHENTICATOR_TYPE } from "../types/account";

/**
 * Calculate salt for EthWallet authenticator
 *
 * Hashes the binary address bytes (20 bytes), not the hex string.
 * Formula: `SHA256(address_bytes)`
 *
 * @param address - Ethereum address (with or without 0x prefix, any case)
 * @returns Salt as 64-character hex string (32 bytes)
 * @see ./README.md for detailed specifications
 */
export function calculateEthWalletSalt(address: string): string {
  // Remove 0x prefix using shared utility, then normalize to lowercase
  // Ethereum addresses are case-insensitive (EIP-55 checksum is optional)
  const addressHex = normalizeHexPrefix(address).toLowerCase();

  // Validate using our wrapper which uses CosmJS
  validateEthereumAddress(`0x${addressHex}`);

  // Decode hex using CosmJS (validates format)
  const addressBinary = fromHex(addressHex);

  // Calculate SHA256 hash using CosmJS
  const saltBytes = sha256(addressBinary);

  // Encode result as hex using CosmJS
  return toHex(saltBytes);
}

/**
 * Calculate salt for Secp256k1 authenticator (Cosmos wallets: Keplr, Leap, etc.)
 *
 * Hashes UTF-8 bytes of the base64 pubkey STRING (44 bytes), not the decoded pubkey bytes (33 bytes).
 * Formula: `SHA256(UTF8_encode(base64_pubkey_string))`
 *
 * @param pubkey - Secp256k1 public key as base64 string (normalized, 44 chars)
 * @returns Salt as 64-character hex string (32 bytes)
 * @see ./README.md for detailed specifications and normalizeSecp256k1PublicKey usage
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
 * Formula: `SHA256(UTF8_encode(jwt_string))`
 *
 * @param jwt - JWT token or identifier (e.g., "aud.sub" format)
 * @returns Salt as 64-character hex string (32 bytes)
 * @see ./README.md for detailed specifications
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
    case AUTHENTICATOR_TYPE.ZKEmail:
      // ZKEmail requires special handling - see calculateZKEmailSalt
      // The credential for ZKEmail should be the email salt (already calculated)
      // If you need to calculate from accountCode + email, use calculateZKEmailSalt
      return calculateSecp256k1Salt(credential);
    default:
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = authenticatorType;
      throw new Error(`Unsupported authenticator type: ${_exhaustive}`);
  }
}

/**
 * Calculate salt for ZKEmail authenticator
 *
 * ZKEmail salt calculation requires the Poseidon hash function from the
 * zk-email circuits. This cannot be implemented in pure JavaScript and
 * requires the WASM module from `@burnt-labs/zk-email-relayer-utils`.
 *
 * Formula: `poseidon(emailAddress, accountCode)` (field element arithmetic)
 *
 * For now, use one of these approaches:
 * 1. Call the backend API endpoint `/generate-email-salt`
 * 2. Use `@burnt-labs/zk-email-relayer-utils` WASM module directly:
 *    ```typescript
 *    import { generateAccountSalt } from "@burnt-labs/zk-email-relayer-utils";
 *    const saltHex = await generateAccountSalt(emailAddress, accountCode);
 *    ```
 * 3. Extract the salt from ZK proof public inputs (index 32)
 *
 * @param emailAddress - Email address for the account
 * @param accountCode - Account code as hex string (with or without 0x prefix)
 * @returns Salt as decimal string (field element representation)
 * @throws Error - This function requires WASM and is not yet implemented
 *
 * @see https://github.com/burnt-labs/zk-email-worker for backend implementation
 * @see https://github.com/burnt-labs/zk-email-relayer-utils for WASM module
 */
export function calculateZKEmailSalt(
  _emailAddress: string,
  _accountCode: string,
): string {
  // ZKEmail salt uses Poseidon hash which requires WASM
  // See: @burnt-labs/zk-email-relayer-utils for the actual implementation
  throw new Error(
    "calculateZKEmailSalt requires the @burnt-labs/zk-email-relayer-utils WASM module. " +
      "Use the backend API endpoint /generate-email-salt or import generateAccountSalt " +
      "from @burnt-labs/zk-email-relayer-utils directly.",
  );
}

/**
 * Convert hex salt string to Uint8Array
 *
 * @param hexSalt - Salt as hex string (64 hex chars = 32 bytes)
 * @returns Salt as Uint8Array (32 bytes)
 * @throws Error if hex salt is invalid format or wrong length
 */
export function hexSaltToUint8Array(hexSalt: string): Uint8Array {
  // Use CosmJS-based validation and decoding
  return validateAndDecodeHex(hexSalt, "salt", { exactByteLength: 32 });
}
