/**
 * Smart account address calculation
 * Pure cryptographic function for calculating deterministic smart account addresses
 */

import { instantiate2Address } from "@cosmjs/cosmwasm-stargate";
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
