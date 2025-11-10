/**
 * Signature formatting utilities
 * Provides consistent signature and message formatting across the SDK
 * These functions format/parse signatures and messages to ensure correct format
 */

import { Buffer } from "buffer";

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

  // Ensure signature has 0x prefix (AA API v2 requires it)
  return signature.startsWith("0x") ? signature : `0x${signature}`;
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

  // Ensure message has 0x prefix for EIP-191/EIP-712 compatibility
  return message.startsWith("0x") ? message : `0x${message}`;
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
