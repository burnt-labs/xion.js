import { verifyMessage as ethersVerifyMessage } from "ethers";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";
import { fromHex, toBech32 } from "@cosmjs/encoding";
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
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
  expectedAddress: string,
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
 * Tries two verification methods (matching smart contract behavior):
 * 1. Plain SHA256(UTF-8(message)) - for programmatic signers
 * 2. ADR-036 wrapped - for Keplr/Leap/OKX signArbitrary
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
  publicKey: string,
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
    throw new Error(
      `Public key must be 33 or 65 bytes, got ${pubkeyBytes.length}`,
    );
  }

  // Try direct verification first (plain SHA256)
  // Hash the message (plain string → UTF-8 bytes → SHA256)
  const messageBytes = Buffer.from(message, "utf8");
  const messageHash = sha256(messageBytes);

  const sig = Secp256k1Signature.fromFixedLength(signatureBytes);
  const directVerification = await Secp256k1.verifySignature(sig, messageHash, pubkeyBytes);

  if (directVerification) {
    return true;
  }

  // If direct verification failed, try ADR-036 verification
  // This matches the smart contract's fallback behavior (sign_arb::verify)
  // ADR-036 format wraps the message in a SignDoc structure
  try {
    const adr036Hash = wrapMessageADR036(messageBytes, pubkeyBytes);
    const adr036Verification = await Secp256k1.verifySignature(sig, adr036Hash, pubkeyBytes);
    return adr036Verification;
  } catch (error: unknown) {
    // If ADR-036 verification fails, return false
    return false;
  }
}

/**
 * Wrap message in ADR-036 format for signature verification
 * Matches the smart contract's sign_arb::wrap_message function
 *
 * @param messageBytes - The message bytes to wrap
 * @param pubkeyBytes - Public key bytes (for deriving signer address)
 * @returns SHA256 hash of the ADR-036 wrapped message
 */
function wrapMessageADR036(
  messageBytes: Uint8Array,
  pubkeyBytes: Uint8Array,
): Uint8Array {
  // Derive signer address from public key
  // Using CosmJS utilities to match the smart contract's derive_addr logic
  const signerAddress = toBech32("xion", rawSecp256k1PubkeyToRawAddress(pubkeyBytes));

  // Encode message as base64
  const msgBase64 = Buffer.from(messageBytes).toString("base64");

  // Create ADR-036 SignDoc envelope
  // This matches the smart contract's format exactly
  const envelope = JSON.stringify({
    account_number: "0",
    chain_id: "",
    fee: { amount: [], gas: "0" },
    memo: "",
    msgs: [
      {
        type: "sign/MsgSignData",
        value: {
          data: msgBase64,
          signer: signerAddress,
        },
      },
    ],
    sequence: "0",
  });

  // Hash the envelope
  return sha256(Buffer.from(envelope, "utf8"));
}
