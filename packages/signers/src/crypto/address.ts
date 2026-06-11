/**
 * Smart account address calculation
 * Pure cryptographic function for calculating deterministic smart account addresses
 */

import { instantiate2Address } from "@cosmjs/cosmwasm-stargate";
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
import { fromBase64, toBech32 } from "@cosmjs/encoding";
import { validateAndDecodeHex, validateAddressPrefix } from "./hex-validation";

/**
 * Calculate the deterministic smart account address using instantiate2
 *
 * This uses the same deterministic address calculation as the smart contract.
 * Given the same inputs, this will always produce the same address.
 *
 * @param config - Configuration for address calculation
 * @param config.checksum - Contract checksum as hex string (64 hex chars = 32 bytes)
 * @param config.creator - Creator address (fee granter)
 * @param config.salt - Salt as hex string (64 hex chars = 32 bytes)
 * @param config.prefix - Address prefix (e.g., "xion")
 * @returns Calculated bech32 address
 */
export function calculateSmartAccountAddress(config: {
  checksum: string;
  creator: string;
  salt: string;
  prefix: string;
}): string {
  // Validate and decode checksum using CosmJS utilities
  const checksumBytes = validateAndDecodeHex(config.checksum, "checksum", {
    exactByteLength: 32,
  });

  // Validate and decode salt using CosmJS utilities
  const saltBytes = validateAndDecodeHex(config.salt, "salt", {
    exactByteLength: 32,
  });

  // Validate prefix format
  validateAddressPrefix(config.prefix, "address prefix");

  return instantiate2Address(
    checksumBytes,
    config.creator,
    saltBytes,
    config.prefix,
  );
}

/**
 * Derive a bech32 address from a raw secp256k1 public key
 *
 * Hashes the raw compressed public key into a Cosmos account address
 * (`sha256` → `ripemd160`, via CosmJS's `rawSecp256k1PubkeyToRawAddress`) and
 * encodes it with the given bech32 prefix. This is the standard "pubkey → cosmos
 * address" derivation, useful for showing the underlying signer address of a
 * Secp256K1 authenticator.
 *
 * Returns `null` rather than throwing for any invalid input (empty/missing
 * arguments, non-base64 pubkey, wrong key length, etc.) so callers can use it
 * directly in rendering paths without try/catch.
 *
 * @param rawPubkeyBase64 - Base64-encoded raw secp256k1 public key (compressed, 33 bytes)
 * @param prefix - Bech32 address prefix (e.g., "xion", "cosmos")
 * @returns The derived bech32 address, or `null` if derivation fails
 */
export function deriveCosmosBech32(
  rawPubkeyBase64: string,
  prefix: string,
): string | null {
  if (!rawPubkeyBase64 || !prefix) return null;
  try {
    const rawAddr = rawSecp256k1PubkeyToRawAddress(fromBase64(rawPubkeyBase64));
    return toBech32(prefix, rawAddr);
  } catch {
    return null;
  }
}
