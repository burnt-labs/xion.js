import { verifyMessage as ethersVerifyMessage } from "ethers";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";
import { fromHex } from "@cosmjs/encoding";
import { normalizeHexPrefix } from "./hex-validation";

/**
 * Verify Ethereum wallet signature
 * @param message - The message that was signed (typically the smart account address)
 * @param signature - The signature to verify (hex format, with or without 0x)
 * @param expectedAddress - The Ethereum address that should have signed
 * @returns true if valid, false otherwise
 * @throws Error if signature format is invalid
 */
export function verifyEthWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    // Normalize signature: remove any existing 0x prefix, then add it back
    // This ensures ethers.js gets the expected format and prevents double-prefixing
    const normalizedSignature = `0x${normalizeHexPrefix(signature)}`;

    const recoveredAddress = ethersVerifyMessage(message, normalizedSignature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Signature recovery failed: ${message}`);
  }
}

/**
 * Verify Secp256k1 signature (Cosmos wallets)
 * @param message - The message that was signed (typically the smart account address)
 * @param signature - The signature to verify (hex format, with or without 0x)
 * @param publicKey - The public key (base64 or hex format)
 * @returns true if valid, false otherwise
 * @throws Error if signature or public key format is invalid
 */
export async function verifySecp256k1Signature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  // Parse signature
  const signatureHex = signature.replace(/^0x/, "");
  let signatureBytes: Uint8Array;

  try {
    signatureBytes = fromHex(signatureHex);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode signature: ${message}`);
  }

  if (signatureBytes.length !== 64) {
    throw new Error(`Signature must be 64 bytes, got ${signatureBytes.length}`);
  }

  // Parse public key (handles both base64 and hex)
  let pubkeyBytes: Uint8Array;
  // Check for hex first (with or without 0x prefix)
  if (/^(0x)?[0-9a-fA-F]+$/.test(publicKey)) {
    // Hex format
    const pubkeyHex = publicKey.replace(/^0x/, "");
    pubkeyBytes = Buffer.from(pubkeyHex, "hex");
  } else if (/^[A-Za-z0-9+/]+=*$/.test(publicKey)) {
    // Base64 format
    pubkeyBytes = Buffer.from(publicKey, "base64");
  } else {
    throw new Error("Public key must be in hex or base64 format");
  }

  if (pubkeyBytes.length !== 33 && pubkeyBytes.length !== 65) {
    throw new Error(`Public key must be 33 or 65 bytes, got ${pubkeyBytes.length}`);
  }

  // Hash the message (same as smart contract does)
  const messageBytes = Buffer.from(message);
  const messageHash = sha256(messageBytes);

  // Verify the signature
  const sig = Secp256k1Signature.fromFixedLength(signatureBytes);
  return await Secp256k1.verifySignature(sig, messageHash, pubkeyBytes);
}
