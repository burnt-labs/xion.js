/**
 * Signature formatting utilities
 * Provides consistent signature and message formatting across the SDK
 * These functions format/parse signatures and messages to ensure correct format
 */

import { Buffer } from "buffer";

/**
 * Normalize hex string by removing all leading "0x" prefixes
 * This makes formatting functions idempotent - safe to call multiple times
 *
 * @param hexString - Hex string that may have "0x" prefix(es)
 * @returns Hex string without any "0x" prefix
 */
function normalizeHexPrefix(hexString: string): string {
  return hexString.replace(/^0x+/i, "");
}

/**
 * Validate that a string contains only valid hex characters and can be decoded
 *
 * @param hexString - Hex string to validate
 * @param context - Context for error messages (e.g., "signature", "message")
 * @throws Error if hex string is invalid
 */
function validateHexEncoding(hexString: string, context: string): void {
  try {
    Buffer.from(hexString, "hex");
  } catch (error) {
    throw new Error(
      `Invalid ${context} format: contains invalid hex characters. ` +
      `Value: "${hexString.substring(0, 20)}...". ` +
      `Hex strings can only contain characters 0-9 and a-f, and must be valid hex encoding.`,
    );
  }
}

/**
 * Convert UTF-8 string to hex string (without 0x prefix)
 * Used for converting text messages to hex format for signing
 *
 * @param text - UTF-8 string to convert
 * @returns Hex string without 0x prefix
 *
 */
export function utf8ToHex(text: string): string {
  if (!text) {
    throw new Error("Text cannot be empty");
  }

  // Validate that input is not already hex
  // Reject if it starts with "0x" (definitely hex)
  if (text.startsWith("0x") || text.startsWith("0X")) {
    throw new Error(
      `Invalid input: text appears to be hex (starts with "0x"). ` +
      `If you need to format hex, use formatHexMessage() instead. ` +
      `Received: "${text.substring(0, 20)}..."`,
    );
  }

  // Warn if string contains only hex characters (likely hex, not UTF-8 text)
  // Legitimate UTF-8 text rarely contains ONLY hex characters
  if (/^[0-9a-fA-F]+$/.test(text) && text.length > 2) {
    console.warn(
      `[utf8ToHex] Warning: Input appears to be hex (contains only hex characters). ` +
      `If you need to format hex, use formatHexMessage() instead. ` +
      `Received: "${text.substring(0, 20)}...". ` +
      `Proceeding with UTF-8 conversion, but this may not be intended.`,
    );
  }

  return Buffer.from(text, "utf8").toString("hex");
}

/**
 * Format Ethereum signature for AA API v2
 * Ensures signature has 0x prefix
 *
 * @param signature - Signature string (with or without 0x prefix)
 * @returns Formatted signature with 0x prefix
 *
 * @example
 * ```typescript
 * formatEthSignature('0x1234...') // Returns '0x1234...'
 * formatEthSignature('1234...')   // Returns '0x1234...'
 * ```
 */
export function formatEthSignature(signature: string): string {
  if (!signature) {
    throw new Error("Signature cannot be empty");
  }

  const normalized = normalizeHexPrefix(signature);
  validateHexEncoding(normalized, "Ethereum signature");

  // Validate normalized signature length
  // Expected: 130 hex characters (65 bytes: r=32 bytes, s=32 bytes, v=1 byte)
  if (normalized.length !== 130) {
    throw new Error(
      `Invalid Ethereum signature format: expected 130 hex characters (65 bytes: 32 bytes r + 32 bytes s + 1 byte v), got ${normalized.length}. ` +
      `Original signature length: ${signature.length}. ` +
      `This may indicate the signature format is incorrect or corrupted.`,
    );
  }

  return `0x${normalized}`;
}

/**
 * Format hex message for signing
 * Ensures message has 0x prefix for EIP-191/EIP-712 compatibility
 *
 * @param message - Hex message string (with or without 0x prefix)
 * @returns Formatted message with 0x prefix
 *
 * @example
 * ```typescript
 * formatHexMessage('0x1234') // Returns '0x1234'
 * formatHexMessage('1234')   // Returns '0x1234'
 * ```
 */
export function formatHexMessage(message: string): string {
  if (!message) {
    throw new Error("Message cannot be empty");
  }

  const normalized = normalizeHexPrefix(message);
  validateHexEncoding(normalized, "hex message");

  return `0x${normalized}`;
}

/**
 * Format Secp256k1 (Cosmos) signature for AA API v2
 * Converts base64 signatures to hex and ensures no 0x prefix (AA API v2 expects hex without prefix)
 *
 * @param signature - Signature string (base64, hex with/without 0x, or object)
 * @returns Formatted signature as hex string without 0x prefix
 *
 * @example
 * ```typescript
 * formatSecp256k1Signature('base64sig...') // Returns hex without 0x
 * formatSecp256k1Signature('0x1234...')     // Returns '1234...' (0x removed)
 * formatSecp256k1Signature('1234...')      // Returns '1234...'
 * ```
 */
export function formatSecp256k1Signature(signature: string | any): string {
  if (!signature) {
    throw new Error("Signature cannot be empty");
  }

  let signatureHex: string;

  if (typeof signature === "string") {
    // Check if it's already hex (64 bytes = 128 hex chars, or 130 with 0x)
    if (signature.length === 128 || signature.length === 130) {
      // Looks like hex - remove 0x prefix if present
      signatureHex = signature.replace(/^0x/, "");
    } else {
      // Assume base64, convert to hex
      const signatureBytes = Buffer.from(signature, "base64");
      signatureHex = signatureBytes.toString("hex");
    }
  } else {
    // Object response, convert to base64 then hex
    const signatureBase64 = Buffer.from(signature).toString("base64");
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    signatureHex = signatureBytes.toString("hex");
  }

  // Ensure no 0x prefix (AA API v2 expects hex without prefix for Secp256k1)
  return signatureHex.replace(/^0x/, "");
}

/**
 * Format Secp256k1 pubkey for AA API v2
 * Ensures pubkey is hex format without 0x prefix (AA API v2 expects hex without prefix)
 *
 * @param pubkey - Pubkey string (hex with/without 0x, or base64)
 * @returns Formatted pubkey as hex string without 0x prefix
 *
 * @example
 * ```typescript
 * formatSecp256k1Pubkey('0x1234...') // Returns '1234...' (0x removed)
 * formatSecp256k1Pubkey('1234...')   // Returns '1234...'
 * formatSecp256k1Pubkey('base64...') // Converts base64 to hex
 * ```
 */
export function formatSecp256k1Pubkey(pubkey: string): string {
  if (!pubkey) {
    throw new Error("Pubkey cannot be empty");
  }

  // Check if it's base64
  // Base64 pubkeys are usually longer than hex (33 bytes = 44 base64 chars, 65 bytes = 88 base64 chars)
  // Hex would be 66 chars (33 bytes) or 130 chars (65 bytes)
  if (
    pubkey.length > 100 ||
    (!pubkey.match(/^[0-9a-fA-Fx]+$/) && pubkey.length === 44) ||
    pubkey.length === 88
  ) {
    // Looks like base64, convert to hex
    const pubkeyBytes = Buffer.from(pubkey, "base64");
    return pubkeyBytes.toString("hex");
  }

  // Already hex, just remove 0x prefix if present
  return pubkey.replace(/^0x/, "");
}
