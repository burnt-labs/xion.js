/**
 * Shared hex validation utilities
 * Provides consistent hex validation across the SDK and monorepo
 *
 * This module wraps CosmJS utilities with additional validation and
 * convenient helpers for common operations.
 *
 * @packageDocumentation
 */

import { fromHex, toHex } from "@cosmjs/encoding";
import { fromBech32, toBech32, normalizeBech32 } from "@cosmjs/encoding";

/**
 * Hex validation pattern - matches only valid hex characters (0-9, a-f, A-F)
 * Use this constant for consistent hex validation across the codebase
 */
export const HEX_PATTERN = /^[0-9a-fA-F]+$/;

/**
 * Ethereum address pattern (40 hex characters, requires 0x prefix)
 */
export const ETH_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * Bech32 address pattern (prefix + separator + data)
 * Matches addresses like: xion1..., cosmos1..., osmo1...
 */
export const BECH32_ADDRESS_PATTERN = /^[a-z][a-z0-9]*1[a-z0-9]{38,}$/;

/**
 * Validates that a string contains only valid hex characters
 */
export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/**
 * Validates and decodes hex string using CosmJS utilities
 * Returns the decoded bytes while validating format
 *
 * This wraps CosmJS's fromHex() with additional validation:
 * - Validates even length
 * - Validates hex characters
 * - Optionally validates exact byte length
 *
 * @param hexString - Hex string to validate and decode (without 0x prefix)
 * @param context - Context for error messages (e.g., "checksum", "salt", "signature")
 * @param options - Validation options
 * @returns Decoded Uint8Array
 */
export function validateAndDecodeHex(
  hexString: string,
  context: string,
  options: {
    allowEmpty?: boolean;
    exactByteLength?: number;
  } = {},
): Uint8Array {
  const { allowEmpty = false, exactByteLength } = options;

  // Check for empty
  if (!hexString) {
    if (allowEmpty) {
      return new Uint8Array();
    }
    throw new Error(`Invalid ${context}: cannot be empty`);
  }

  // Validate exact length if specified (before decoding for better error messages)
  if (exactByteLength !== undefined) {
    const expectedHexLength = exactByteLength * 2;
    if (hexString.length !== expectedHexLength) {
      throw new Error(
        `Invalid ${context}: must be exactly ${exactByteLength} bytes ` +
          `(${expectedHexLength} hex characters), got ${hexString.length / 2} bytes ` +
          `(${hexString.length} hex characters).`,
      );
    }
  }

  // Use CosmJS's fromHex which validates:
  // - Even length
  // - Valid hex characters
  try {
    return fromHex(hexString);
  } catch (error) {
    // Enhance CosmJS error messages with context
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${context}: ${message}`);
  }
}

/**
 * Validates hex string format without decoding
 * Use this for validation-only scenarios where you don't need the decoded bytes
 *
 * @param hexString - Hex string to validate (without 0x prefix)
 * @param context - Context for error messages
 * @param options - Validation options
 */
export function validateHexString(
  hexString: string,
  context: string,
  options: {
    allowEmpty?: boolean;
    requireEvenLength?: boolean;
    exactByteLength?: number;
  } = {},
): void {
  const {
    allowEmpty = false,
    requireEvenLength = true,
    exactByteLength,
  } = options;

  // Check for empty
  if (!hexString) {
    if (allowEmpty) {
      return;
    }
    throw new Error(`Invalid ${context}: cannot be empty`);
  }

  // Check for invalid hex characters
  if (!HEX_PATTERN.test(hexString)) {
    const invalidChars = hexString.match(/[^0-9a-fA-F]/g);
    throw new Error(
      `Invalid ${context}: contains invalid hex characters: ${invalidChars?.join(", ")}. ` +
        `Hex strings can only contain 0-9 and a-f.`,
    );
  }

  // Validate even length
  if (requireEvenLength && hexString.length % 2 !== 0) {
    throw new Error(
      `Invalid ${context}: hex string must have even length (got ${hexString.length} characters).`,
    );
  }

  // Validate exact byte length if specified
  if (exactByteLength !== undefined) {
    const expectedHexLength = exactByteLength * 2;
    if (hexString.length !== expectedHexLength) {
      throw new Error(
        `Invalid ${context}: must be exactly ${exactByteLength} bytes ` +
          `(${expectedHexLength} hex characters), got ${hexString.length / 2} bytes ` +
          `(${hexString.length} hex characters).`,
      );
    }
  }

  // Final validation using CosmJS (will catch any edge cases)
  try {
    fromHex(hexString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${context}: ${message}`);
  }
}

/**
 * Validates Ethereum address format (40 hex characters, case-insensitive)
 * Uses CosmJS's fromHex for validation
 */
export function validateEthereumAddress(address: string): void {
  if (!address) {
    throw new Error("Invalid Ethereum address: cannot be empty");
  }

  const normalized = address.replace(/^0x/i, "");

  // Validate hex format and length (must be exactly 40 hex chars = 20 bytes)
  if (!/^[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new Error(
      `Invalid Ethereum address: expected 40 hex characters (20 bytes), ` +
        `got "${normalized.substring(0, 20)}..."`,
    );
  }

  // Use CosmJS to validate the hex can actually be decoded
  try {
    fromHex(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Ethereum address: ${message}`);
  }
}

/**
 * Validates bech32 address format using CosmJS's fromBech32
 *
 * @param address - Bech32 address to validate (e.g., "xion1...")
 * @param context - Context for error messages
 * @param expectedPrefix - Expected address prefix (e.g., "xion", "cosmos")
 */
export function validateBech32Address(
  address: string,
  context = "bech32 address",
  expectedPrefix?: string,
): void {
  if (!address) {
    throw new Error(`Invalid ${context}: cannot be empty`);
  }

  // Use CosmJS's fromBech32 which properly validates the address
  try {
    const { prefix } = fromBech32(address);

    // Check prefix if specified
    if (expectedPrefix !== undefined && prefix !== expectedPrefix) {
      throw new Error(
        `Invalid ${context}: expected prefix "${expectedPrefix}", got "${prefix}"`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid ${context}: must be valid bech32 format (e.g., "xion1..."), got "${address.substring(0, 20)}...". ` +
        `Error: ${message}`,
    );
  }
}

/**
 * Validates address prefix format (lowercase alphanumeric, starts with letter)
 */
export function validateAddressPrefix(
  prefix: string,
  context = "address prefix",
): void {
  if (!prefix) {
    throw new Error(`Invalid ${context}: cannot be empty`);
  }

  if (!/^[a-z][a-z0-9]*$/.test(prefix)) {
    throw new Error(
      `Invalid ${context}: must start with lowercase letter and contain only ` +
        `lowercase alphanumeric characters (got "${prefix}")`,
    );
  }
}

/**
 * Normalize hex string by removing all leading "0x" prefixes
 * This makes formatting functions idempotent - safe to call multiple times
 */
export function normalizeHexPrefix(hexString: string): string {
  // Use while loop instead of regex to handle multiple "0x" prefixes
  // Regex /^0x+/i only removes one "0x", not multiple "0x0x" patterns
  let normalized = hexString;
  while (normalized.toLowerCase().startsWith("0x")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

/**
 * Ensure hex string has "0x" prefix
 * Safely adds "0x" prefix if missing, handles duplicate prefixes
 * This makes formatting functions idempotent - safe to call multiple times
 *
 * @param hexString - Hex string with or without "0x" prefix
 * @returns Hex string with exactly one "0x" prefix
 *
 * @example
 * ```ts
 * ensureHexPrefix("742d35cc...")  // Returns: "0x742d35cc..."
 * ensureHexPrefix("0x742d35cc...") // Returns: "0x742d35cc..."
 * ensureHexPrefix("0x0x742d35cc...") // Returns: "0x742d35cc..." (removes duplicate)
 * ```
 */
export function ensureHexPrefix(hexString: string): string {
  // First normalize to remove any duplicate 0x prefixes
  const normalized = normalizeHexPrefix(hexString);
  // Then add single 0x prefix
  return `0x${normalized}`;
}

/**
 * Re-export CosmJS utilities for convenience
 * Use these directly when you don't need additional validation
 */
export { fromHex, toHex, fromBech32, toBech32, normalizeBech32 };
