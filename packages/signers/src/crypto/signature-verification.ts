import { verifyMessage as ethersVerifyMessage } from "ethers";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";
import { fromHex } from "@cosmjs/encoding";
import { normalizeHexPrefix } from "./hex-validation";

/**
 * Verify Ethereum wallet signature
 *
 * @param message - The message that was signed (typically the smart account address)
 * @param signature - The signature to verify (hex format, with or without 0x prefix)
 * @param expectedAddress - The Ethereum address that should have signed
 * @returns true if valid, false otherwise
 * @throws Error if signature format is invalid
 * @see ./README.md for detailed specifications
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
 * Verify Secp256k1 signature (Cosmos wallets: Keplr, Leap, Cosmostation)
 *
 * Verifies signature over SHA256(UTF-8(message)). Matches the smart contract verification
 * during account instantiation.
 *
 * @param message - Message that was signed (plain string, typically bech32 address like "xion1...")
 * @param signature - Signature in hex format (with or without 0x prefix, must be exactly 64 bytes)
 * @param publicKey - Public key in base64 format (must be exactly 33 or 65 bytes when decoded)
 * @returns true if signature is valid, false otherwise
 * @throws Error if signature or public key format is invalid
 * @see ./README.md for detailed specifications
 *
 */
export async function verifySecp256k1Signature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  // Parse signature - hex format (with or without 0x prefix)
  const signatureHex = normalizeHexPrefix(signature);
  let signatureBytes: Uint8Array;

  try {
    signatureBytes = fromHex(signatureHex);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode signature: ${errorMsg}`);
  }

  if (signatureBytes.length !== 64) {
    throw new Error(`Signature must be 64 bytes, got ${signatureBytes.length}`);
  }

  // Parse public key - base64 format only
  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = Buffer.from(publicKey, "base64");
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode public key: ${errorMsg}`);
  }

  if (pubkeyBytes.length !== 33 && pubkeyBytes.length !== 65) {
    throw new Error(`Public key must be 33 or 65 bytes, got ${pubkeyBytes.length}`);
  }

  // Hash the message (plain string → UTF-8 bytes → SHA256)
  // This matches the smart contract verification logic
  const messageBytes = Buffer.from(message, "utf8");
  const messageHash = sha256(messageBytes);

  // Verify the signature
  const sig = Secp256k1Signature.fromFixedLength(signatureBytes);
  return await Secp256k1.verifySignature(sig, messageHash, pubkeyBytes);
}
