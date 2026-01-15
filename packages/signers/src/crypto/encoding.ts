/**
 * Generic encoding/decoding utilities for base64 and hex
 */

/**
 * Converts a byte array (Buffer or Uint8Array) to a hexadecimal string
 *
 * @param bytes - Buffer or Uint8Array to encode
 * @returns Hex string without 0x prefix
 *
 * @example
 * ```typescript
 * const bytes = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
 * const hex = encodeHex(bytes); // "48656c6c6f"
 * ```
 */
export function encodeHex(bytes: Buffer | Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts a Uint8Array to a base64 string
 *
 * @param pubkey - Uint8Array to encode
 * @returns Base64-encoded string
 *
 * @example
 * ```typescript
 * const pubkey = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
 * const base64 = getHumanReadablePubkey(pubkey); // "SGVsbG8="
 * ```
 */
export function getHumanReadablePubkey(pubkey: Uint8Array | undefined): string {
  if (!pubkey) {
    return "";
  }
  const pubUint8Array = new Uint8Array(Object.values(pubkey));
  const pubBase64 = btoa(String.fromCharCode.apply(null, [...pubUint8Array]));
  return pubBase64;
}

/**
 * Converts a URL-safe Base64 string to standard Base64
 *
 * URL-safe Base64 uses `-` instead of `+` and `_` instead of `/`,
 * and omits padding `=` characters.
 *
 * @param urlSafeBase64 - URL-safe base64 string
 * @returns Standard base64 string with proper padding
 *
 * @example
 * ```typescript
 * const urlSafe = "SGVsbG8-V29ybGQ_";
 * const standard = convertToStandardBase64(urlSafe); // "SGVsbG8+V29ybGQ/"
 * ```
 */
export function convertToStandardBase64(urlSafeBase64: string): string {
  let base64 = urlSafeBase64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding to make length multiple of 4
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return base64;
}

/**
 * Converts a standard Base64 string to URL-safe Base64
 *
 * URL-safe Base64 uses `-` instead of `+` and `_` instead of `/`,
 * and removes padding `=` characters.
 *
 * @param base64 - Standard base64 string
 * @returns URL-safe base64 string without padding
 *
 * @example
 * ```typescript
 * const standard = "SGVsbG8+V29ybGQ/";
 * const urlSafe = toUrlSafeBase64(standard); // "SGVsbG8-V29ybGQ_"
 * ```
 */
export function toUrlSafeBase64(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Converts a URL-safe Base64 string to an ArrayBuffer
 *
 * @param base64Url - URL-safe base64 string
 * @returns ArrayBuffer containing the decoded bytes
 *
 * @example
 * ```typescript
 * const urlSafe = "SGVsbG8-V29ybGQ_";
 * const buffer = getBufferFromUrlSafeBase64(urlSafe);
 * ```
 */
export function getBufferFromUrlSafeBase64(base64Url: string): ArrayBuffer {
  const base64 = convertToStandardBase64(base64Url);
  return Buffer.from(base64, "base64").buffer;
}
