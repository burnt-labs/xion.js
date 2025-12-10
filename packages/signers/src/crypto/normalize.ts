/**
 * Normalization utilities for crypto identifiers
 * Pure functions for normalizing Ethereum addresses, Secp256k1 public keys, and JWT identifiers
 */

/**
 * Normalize an Ethereum address to lowercase format with 0x prefix
 *
 * Accepts addresses with OR without "0x" prefix for backward compatibility.
 * Auto-adds "0x" prefix if missing, then validates the format.
 *
 * @param address - The Ethereum address to normalize (with or without 0x prefix)
 * @returns Normalized address in lowercase with 0x prefix (always includes "0x")
 * @throws Error if the address is empty or invalid format
 *
 * @example
 * ```ts
 * normalizeEthereumAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0")
 * // Returns: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0"
 *
 * normalizeEthereumAddress("742d35Cc6634C0532925a3b844Bc9e7595f0bEb0")
 * // Returns: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0"
 * ```
 */
export function normalizeEthereumAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error("Ethereum address cannot be empty");
  }

  // Auto-add 0x prefix if missing (backward compatibility with main branch)
  // This ensures addresses work with OR without the prefix
  let normalized = trimmed.toLowerCase();
  if (!normalized.startsWith("0x")) {
    normalized = `0x${normalized}`;
  }

  // Validate final format: must be exactly 0x + 40 hex characters
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(
      `Invalid Ethereum address format. Expected 40 hex characters (20 bytes), got: ${trimmed}`
    );
  }

  return normalized;
}

/**
 * Normalize a Secp256k1 public key to base64 format
 * Converts hex-encoded keys to base64 format for consistency with /cosmos.crypto.secp256k1.PubKey
 *
 * @param pubkey - The public key in hex (compressed/uncompressed) or base64 format
 * @returns Normalized public key in base64 format
 * @throws Error if the public key is empty or invalid format
 *
 * @example
 * ```ts
 * // Compressed hex (66 chars)
 * normalizeSecp256k1PublicKey("02123456789abcdef...")
 * // Returns: base64-encoded string
 *
 * // Already base64 (44 chars starting with 'A')
 * normalizeSecp256k1PublicKey("A1234567890123456789012345678901234567890123")
 * // Returns: same string (already normalized)
 * ```
 */
export function normalizeSecp256k1PublicKey(pubkey: string): string {
  const trimmed = pubkey.trim();
  if (!trimmed) {
    throw new Error("Public key cannot be empty");
  }

  // If it's already in base64 format (starts with 'A' and matches pattern), validate and return
  // Base64-encoded compressed secp256k1 public key (33 bytes = 44 base64 chars with padding)
  if (/^A[A-Za-z0-9+/]{43}$/.test(trimmed)) {
    // Validate that it's actually decodable base64
    try {
      const decoded = Buffer.from(trimmed, "base64");
      // Verify it decodes to valid secp256k1 key length (33 or 65 bytes)
      if (decoded.length !== 33 && decoded.length !== 65) {
        throw new Error(`Decoded key must be 33 or 65 bytes, got ${decoded.length}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid base64 pubkey: ${message}`);
    }
    return trimmed;
  }

  // Compressed hex: 66 characters starting with 02 or 03
  if (/^0[23][0-9a-fA-F]{64}$/.test(trimmed)) {
    const buffer = Buffer.from(trimmed, "hex");
    return buffer.toString("base64");
  }

  // Uncompressed hex: 130 characters starting with 04
  if (/^04[0-9a-fA-F]{128}$/.test(trimmed)) {
    const buffer = Buffer.from(trimmed, "hex");
    return buffer.toString("base64");
  }

  // If we reach here, the format is unrecognized
  throw new Error(
    `Invalid Secp256k1 public key format: ${trimmed.substring(0, 50)}${trimmed.length > 50 ? "..." : ""}`
  );
}

/**
 * Normalize a JWT identifier by extracting and combining aud and sub claims
 * Note: This function expects the JWT to already be decoded. For decoding JWTs,
 * use the `jose` library's `decodeJwt` function in your application code.
 *
 * @param aud - The audience claim (can be string or string array)
 * @param sub - The subject claim
 * @returns Normalized identifier in "aud.sub" format
 * @throws Error if aud or sub are missing
 *
 * @example
 * ```ts
 * // With string aud
 * normalizeJWTIdentifier("my-app", "user-123")
 * // Returns: "my-app.user-123"
 *
 * // With array aud (uses first element)
 * normalizeJWTIdentifier(["my-app", "other-app"], "user-123")
 * // Returns: "my-app.user-123"
 * ```
 */
export function normalizeJWTIdentifier(
  aud: string | string[],
  sub: string
): string {
  if (!aud || !sub) {
    throw new Error('JWT identifier must contain valid "aud" and "sub" claims');
  }

  // Handle array aud by taking the first element
  const audValue = Array.isArray(aud) ? aud[0] : aud;

  if (!audValue) {
    throw new Error('JWT "aud" claim cannot be empty');
  }

  return `${audValue}.${sub}`;
}
