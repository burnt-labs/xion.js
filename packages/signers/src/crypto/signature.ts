/**
 * Signature formatting utilities
 * Provides consistent signature and message formatting across the SDK
 * These functions format/parse signatures and messages to ensure correct format
 */

import { fromHex, toHex } from "@cosmjs/encoding";
import { normalizeHexPrefix, validateHexString } from "./hex-validation";

/**
 * Convert UTF-8 string to hex string (without 0x prefix)
 * Used for converting text messages to hex format for signing
 *
 * @param text - UTF-8 string to convert
 * @returns Hex string without 0x prefix
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

  // Use CosmJS toHex instead of Buffer
  const textBytes = new TextEncoder().encode(text);
  return toHex(textBytes);
}

/**
 * Convert UTF-8 string to hex string with 0x prefix
 * Ensures exactly one 0x prefix (never double-prefixes)
 * Used for converting text messages to hex format for signing when 0x prefix is required
 *
 * @param text - UTF-8 string to convert
 * @returns Hex string with exactly one 0x prefix
 */
export function utf8ToHexWithPrefix(text: string): string {
  const hex = utf8ToHex(text);
  // Ensure exactly one 0x prefix - remove if already present, then add
  const normalized = normalizeHexPrefix(hex);
  return `0x${normalized}`;
}

/**
 * Format Ethereum signature for AA API v2
 * Ensures signature has 0x prefix
 *
 * @param signature - Signature string (with or without 0x prefix)
 * @returns Formatted signature with 0x prefix
 */
export function formatEthSignature(signature: string): string {
  if (!signature) {
    throw new Error("Signature cannot be empty");
  }

  const normalized = normalizeHexPrefix(signature);

  // Validate using our wrapper (which uses CosmJS internally)
  validateHexString(normalized, "Ethereum signature", {
    exactByteLength: 65, // 65 bytes: r=32 bytes, s=32 bytes, v=1 byte
  });

  return `0x${normalized}`;
}

/**
 * Format hex message for signing
 * Ensures message has 0x prefix for EIP-191/EIP-712 compatibility
 *
 * @param message - Hex message string (with or without 0x prefix)
 * @returns Formatted message with 0x prefix
 */
export function formatHexMessage(message: string): string {
  if (!message) {
    throw new Error("Message cannot be empty");
  }

  const normalized = normalizeHexPrefix(message);

  // Validate using CosmJS-backed validation
  validateHexString(normalized, "hex message");

  return `0x${normalized}`;
}

/**
 * Format Secp256k1 (Cosmos) signature for AA API v2
 * Converts base64 signatures to hex and ensures no 0x prefix (AA API v2 expects hex without prefix)
 *
 * @param signature - Signature string (base64, hex with/without 0x, or object)
 * @returns Formatted signature as hex string without 0x prefix
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
      signatureHex = normalizeHexPrefix(signature);
    } else {
      // Assume base64, convert to hex using CosmJS
      try {
        // Decode base64 to bytes, then encode as hex
        const signatureBytes = Uint8Array.from(atob(signature), (c) =>
          c.charCodeAt(0),
        );
        signatureHex = toHex(signatureBytes);
      } catch (error) {
        throw new Error(
          `Invalid signature format: expected base64 or hex string. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } else {
    // Object response, convert to base64 then hex
    try {
      const signatureArray = signature as Uint8Array | number[];
      const signatureBase64 = btoa(
        String.fromCharCode(...Array.from(signatureArray)),
      );
      const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) =>
        c.charCodeAt(0),
      );
      signatureHex = toHex(signatureBytes);
    } catch (error) {
      throw new Error(
        `Invalid signature object. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Ensure no 0x prefix (AA API v2 expects hex without prefix for Secp256k1)
  return normalizeHexPrefix(signatureHex);
}

/**
 * Format Secp256k1 pubkey for AA API v2
 * Ensures pubkey is hex format without 0x prefix (AA API v2 expects hex without prefix)
 *
 * @param pubkey - Pubkey string (hex with/without 0x, or base64)
 * @returns Formatted pubkey as hex string without 0x prefix
 */
export function formatSecp256k1Pubkey(pubkey: string): string {
  if (!pubkey) {
    throw new Error("Pubkey cannot be empty");
  }

  // Remove 0x prefix first to get consistent length checks
  const normalized = normalizeHexPrefix(pubkey);

  // Check for exact hex lengths FIRST (before base64 check)
  // Valid compressed (33 bytes = 66 hex) or uncompressed (65 bytes = 130 hex) pubkey
  if (normalized.length === 66 || normalized.length === 130) {
    // Validate it's valid hex
    if (/^[0-9a-fA-F]+$/.test(normalized)) {
      return normalized;
    }
  }

  // Detect base64 by presence of non-hex characters (+, /, =, etc.)
  if (/[^0-9a-fA-F]/.test(normalized)) {
    // Contains non-hex chars, must be base64 - convert to hex using CosmJS
    try {
      const pubkeyBytes = Uint8Array.from(atob(pubkey), (c) => c.charCodeAt(0));
      return toHex(pubkeyBytes);
    } catch (error) {
      throw new Error(
        `Invalid pubkey format: expected base64 or hex string. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Already hex, return normalized (without 0x prefix)
  return normalized;
}

/**
 * Convert Ethereum signature from hex to base64 format
 * Used by AA API for signature storage/transmission
 *
 * @param signature - Hex signature (with or without 0x prefix)
 * @returns Base64-encoded signature
 * @throws Error if signature is invalid or wrong length
 */
export function formatEthSignatureToBase64(signature: string): string {
  if (!signature) {
    throw new Error("Signature cannot be empty");
  }

  const normalized = normalizeHexPrefix(signature);

  // Validate and decode using CosmJS
  let signatureBinary: Uint8Array;
  try {
    signatureBinary = fromHex(normalized);
  } catch (error) {
    throw new Error(
      `Invalid Ethereum signature: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Validate signature length: 65 bytes
  if (signatureBinary.length !== 65) {
    throw new Error(
      `EthWallet signature must be 65 bytes, got ${signatureBinary.length}`,
    );
  }

  // Convert to base64
  return btoa(String.fromCharCode(...Array.from(signatureBinary)));
}

/**
 * Convert Secp256k1 signature from hex to base64 format
 * Used by AA API for signature storage/transmission
 *
 * @param signature - Hex signature (with or without 0x prefix)
 * @returns Base64-encoded signature
 * @throws Error if signature is invalid or wrong length
 */
export function formatSecp256k1SignatureToBase64(signature: string): string {
  if (!signature) {
    throw new Error("Signature cannot be empty");
  }

  const normalized = normalizeHexPrefix(signature);

  // Validate and decode using CosmJS
  let signatureBinary: Uint8Array;
  try {
    signatureBinary = fromHex(normalized);
  } catch (error) {
    throw new Error(
      `Invalid Secp256k1 signature: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Validate signature length: 64 bytes
  if (signatureBinary.length !== 64) {
    throw new Error(
      `Secp256K1 signature must be 64 bytes, got ${signatureBinary.length}`,
    );
  }

  // Convert to base64
  return btoa(String.fromCharCode(...Array.from(signatureBinary)));
}
