/**
 * Smart account address calculation
 * Extracted from AA API prepare.ts
 */

import { instantiate2Address } from "@cosmjs/cosmwasm-stargate";
import { Buffer } from "buffer";

/**
 * Calculate the deterministic smart account address using instantiate2
 *
 * This uses the same deterministic address calculation as the smart contract.
 * Given the same inputs, this will always produce the same address.
 *
 * @param config - Configuration for address calculation
 * @param config.checksum - Contract checksum as hex string
 * @param config.creator - Creator address (fee granter)
 * @param config.salt - Salt as hex string
 * @param config.prefix - Address prefix (e.g., "xion")
 * @returns Calculated bech32 address
 */
export function calculateSmartAccountAddress(config: {
  checksum: string;
  creator: string;
  salt: string;
  prefix: string;
}): string {
  const checksumBytes = Uint8Array.from(Buffer.from(config.checksum, "hex"));
  const saltBytes = Uint8Array.from(Buffer.from(config.salt, "hex"));

  return instantiate2Address(
    checksumBytes,
    config.creator,
    saltBytes,
    config.prefix,
  );
}
