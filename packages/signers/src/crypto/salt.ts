/**
 * Salt calculation utilities
 * Extracted from AA API prepare.ts
 */

import { sha256 } from "@cosmjs/crypto";
import { Buffer } from "buffer";

/**
 * Calculate salt for EthWallet authenticator
 *
 * Salt is sha256(address_bytes) where address is the hex Ethereum address
 *
 * @param address - Ethereum address (with or without 0x prefix)
 * @returns Salt as hex string
 */
export function calculateEthWalletSalt(address: string): string {
  const addressHex = address.replace(/^0x/, "");
  const addressBinary = Buffer.from(addressHex, "hex");
  const saltBytes = sha256(addressBinary);
  return Buffer.from(saltBytes).toString("hex");
}

/**
 * Calculate salt for Secp256k1 authenticator
 *
 * Salt is sha256(pubkey_string) where pubkey is the hex public key
 *
 * @param pubkey - Secp256k1 public key as hex string
 * @returns Salt as hex string
 */
export function calculateSecp256k1Salt(pubkey: string): string {
  const saltBytes = sha256(Buffer.from(pubkey));
  return Buffer.from(saltBytes).toString("hex");
}

/**
 * Calculate salt based on wallet type
 *
 * @param walletType - Type of wallet authenticator
 * @param credential - Address (for EthWallet) or pubkey (for Secp256K1)
 * @returns Salt as hex string
 */
export function calculateSalt(
  walletType: "EthWallet" | "Secp256K1",
  credential: string,
): string {
  if (walletType === "EthWallet") {
    return calculateEthWalletSalt(credential);
  } else {
    return calculateSecp256k1Salt(credential);
  }
}
