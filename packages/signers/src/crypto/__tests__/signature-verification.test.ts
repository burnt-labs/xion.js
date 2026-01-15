/**
 * Signature Verification Integration Tests
 *
 * Tests complete signature flows that match the AA-API and smart contract behavior:
 * 1. Sign a message (smart account address)
 * 2. Verify the signature using the same logic as AA-API
 * 3. Ensure signature format matches what the smart contract expects
 *
 * This validates the complete signing pipeline used by the AA-API and smart contracts.
 */

import { describe, it, expect } from "vitest";
import {
  verifySecp256k1Signature,
  verifyEthWalletSignature,
} from "../signature-verification";
import {
  Secp256k1,
  sha256,
  Slip10,
  Slip10Curve,
  stringToPath,
  Bip39,
  EnglishMnemonic,
} from "@cosmjs/crypto";
import { toHex, fromHex } from "@cosmjs/encoding";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { HDNodeWallet } from "ethers";
import { utf8ToHexWithPrefix } from "../signature";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

/**
 * Helper to create Secp256k1 keypair for testing
 */
async function createSecp256k1Keypair(accountIndex: number = 0) {
  // Create wallet to get public key
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(TEST_MNEMONIC, {
    prefix: "xion",
    hdPaths: [stringToPath(`m/44'/118'/0'/0/${accountIndex}`)],
  });

  const [account] = await wallet.getAccounts();
  const compressedPubkey = Secp256k1.compressPubkey(account.pubkey);
  const pubkeyHex = toHex(compressedPubkey);

  // Get private key for signing
  const mnemonicObj = new EnglishMnemonic(TEST_MNEMONIC);
  const seed = await Bip39.mnemonicToSeed(mnemonicObj);
  const { privkey } = Slip10.derivePath(
    Slip10Curve.Secp256k1,
    seed,
    stringToPath(`m/44'/118'/0'/0/${accountIndex}`),
  );

  return { pubkeyHex, privkey, compressedPubkey };
}

describe("Signature Verification - AA-API Integration", () => {
  describe("Secp256k1 Signature Verification", () => {
    it("should verify signature over smart account address (bech32 string)", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      // Smart account address (what user signs during account creation)
      const smartAccountAddress = "xion1testaccount1234567890abcdefgh";

      // Sign the message (plain UTF-8 string → SHA256)
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);
      const sig = await Secp256k1.createSignature(digest, privkey);

      // Format signature as hex (r + s, 64 bytes = 128 hex chars)
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify using the same function as AA-API
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress, // Plain bech32 string
        signatureHex, // Hex signature
        pubkeyBase64, // Compressed pubkey in base64
      );

      expect(isValid).toBe(true);
    });

    it("should verify signature with base64 pubkey", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1aaabbbcccdddeeefff1234567890";

      // Sign (plain UTF-8 string → SHA256)
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);
      const sig = await Secp256k1.createSignature(digest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify with base64 pubkey
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex,
        pubkeyBase64, // Base64 format
      );

      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1testaccount";

      // Use a different message's signature (will be invalid)
      const wrongMessage = "xion1wrongaddress";
      const wrongMessageBytes = Buffer.from(wrongMessage, "utf8");
      const wrongDigest = sha256(wrongMessageBytes);

      // Create signature over wrong message using a different keypair
      const { privkey: wrongPrivkey } = await createSecp256k1Keypair(1);
      const wrongSig = await Secp256k1.createSignature(
        wrongDigest,
        wrongPrivkey,
      );
      const wrongSignatureBytes = new Uint8Array([
        ...wrongSig.r(32),
        ...wrongSig.s(32),
      ]);
      const wrongSignatureHex = toHex(wrongSignatureBytes);

      // Should reject because signature is over different message
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress, // Correct message
        wrongSignatureHex, // Signature over wrong message
        pubkeyBase64,
      );

      expect(isValid).toBe(false);
    });

    it("should support bech32 string format (standard format)", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1testaccount";

      // Sign using UTF-8 bytes
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);
      const sig = await Secp256k1.createSignature(digest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify with plain string
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress, // Plain bech32 string
        signatureHex,
        pubkeyBase64,
      );

      expect(isValid).toBe(true);
    });

    it("should reject signature with wrong public key", async () => {
      const { privkey } = await createSecp256k1Keypair(0);

      const smartAccountAddress = "xion1testaccount";
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);

      // Sign with first key
      const sig = await Secp256k1.createSignature(digest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Use different public key (from different account index)
      const { compressedPubkey: wrongPubkey } = await createSecp256k1Keypair(1);
      const wrongPubkeyBase64 = Buffer.from(wrongPubkey).toString("base64");

      // Should reject because pubkey doesn't match signature
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex,
        wrongPubkeyBase64, // Wrong pubkey
      );

      expect(isValid).toBe(false);
    });

    it("should throw error for invalid signature format", async () => {
      const pubkeyBytes = new Uint8Array(33);
      pubkeyBytes[0] = 0x02; // Valid compressed pubkey prefix
      const pubkeyBase64 = Buffer.from(pubkeyBytes).toString("base64");
      const message = "Hello";

      // Invalid signature (not 64 bytes)
      const invalidSignature = "abcd1234"; // Too short

      await expect(
        verifySecp256k1Signature(message, invalidSignature, pubkeyBase64),
      ).rejects.toThrow(/Signature must be 64 bytes/);
    });

    it("should throw error for invalid public key format", async () => {
      const message = "Hello";
      const signatureHex = "a".repeat(128); // Valid 64-byte signature

      // Invalid pubkey (not 33 or 65 bytes when decoded from base64)
      const invalidPubkey = "abcd"; // Too short base64

      await expect(
        verifySecp256k1Signature(message, signatureHex, invalidPubkey),
      ).rejects.toThrow(/Public key must be 33 or 65 bytes/);
    });

    it("should handle signature with 0x prefix", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1test";
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);

      const sig = await Secp256k1.createSignature(digest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = "0x" + toHex(signatureBytes); // Add 0x prefix

      // Should handle 0x prefix correctly
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex, // With 0x prefix
        pubkeyBase64,
      );

      expect(isValid).toBe(true);
    });

    it("should verify ADR-036 wrapped signature (Keplr signArbitrary)", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1test";
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");

      // Create ADR-036 wrapped signature (simulating Keplr's signArbitrary)
      // This matches the smart contract's sign_arb::wrap_message function
      const { toBech32 } = await import("@cosmjs/encoding");
      const { rawSecp256k1PubkeyToRawAddress } = await import("@cosmjs/amino");

      // Derive signer address from public key
      const signerAddress = toBech32(
        "xion",
        rawSecp256k1PubkeyToRawAddress(compressedPubkey),
      );

      // Encode message as base64
      const msgBase64 = Buffer.from(messageBytes).toString("base64");

      // Create ADR-036 SignDoc envelope
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

      // Hash the ADR-036 envelope and sign it
      const adr036Hash = sha256(Buffer.from(envelope, "utf8"));
      const sig = await Secp256k1.createSignature(adr036Hash, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify - should succeed via ADR-036 fallback path
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex,
        pubkeyBase64,
      );

      expect(isValid).toBe(true);
    });

    it("should reject signature that fails both direct and ADR-036 verification", async () => {
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const smartAccountAddress = "xion1test";

      // Create a signature that doesn't match either verification method
      // Sign a completely different message
      const wrongMessage = "completely_different_message_that_wont_match";
      const wrongMessageBytes = Buffer.from(wrongMessage, "utf8");
      const wrongDigest = sha256(wrongMessageBytes);

      const sig = await Secp256k1.createSignature(wrongDigest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Should fail both direct SHA256 and ADR-036 verification
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex,
        pubkeyBase64,
      );

      expect(isValid).toBe(false);
    });

    it("should generate deterministic ADR-036 envelope", async () => {
      // This test verifies that the ADR-036 envelope generation is deterministic
      // across multiple invocations, ensuring consistent cryptographic hashing
      const { compressedPubkey, privkey } = await createSecp256k1Keypair(0);
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      const message = "xion1test";
      const messageBytes = Buffer.from(message, "utf8");

      // Derive signer address from public key (same logic as wrapMessageADR036)
      const { toBech32 } = await import("@cosmjs/encoding");
      const { rawSecp256k1PubkeyToRawAddress } = await import("@cosmjs/amino");
      const signerAddress = toBech32(
        "xion",
        rawSecp256k1PubkeyToRawAddress(compressedPubkey),
      );

      const msgBase64 = Buffer.from(messageBytes).toString("base64");

      // Create ADR-036 envelope using explicit string construction (matching implementation)
      const envelope1 = `{"account_number":"0","chain_id":"","fee":{"amount":[],"gas":"0"},"memo":"","msgs":[{"type":"sign/MsgSignData","value":{"data":"${msgBase64}","signer":"${signerAddress}"}}],"sequence":"0"}`;

      // Create it again
      const envelope2 = `{"account_number":"0","chain_id":"","fee":{"amount":[],"gas":"0"},"memo":"","msgs":[{"type":"sign/MsgSignData","value":{"data":"${msgBase64}","signer":"${signerAddress}"}}],"sequence":"0"}`;

      // Envelopes should be identical
      expect(envelope1).toBe(envelope2);

      // Hashes should be identical
      const hash1 = sha256(Buffer.from(envelope1, "utf8"));
      const hash2 = sha256(Buffer.from(envelope2, "utf8"));
      expect(toHex(hash1)).toBe(toHex(hash2));

      // Sign with the hash and verify it works consistently
      const sig = await Secp256k1.createSignature(hash1, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify the signature (should use ADR-036 path since we signed the ADR-036 hash)
      const isValid = await verifySecp256k1Signature(
        message,
        signatureHex,
        pubkeyBase64,
      );

      expect(isValid).toBe(true);
    });
  });

  describe("EthWallet Signature Verification", () => {
    it("should verify Ethereum signature over smart account address", async () => {
      // Create Ethereum wallet
      const ethWallet = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const ethAddress = ethWallet.address.toLowerCase();
      const smartAccountAddress = "xion1ethwalletaccount";

      // Sign the message as string (ethers.js adds Ethereum message prefix automatically)
      const signature = await ethWallet.signMessage(smartAccountAddress);

      // Verify using same function as AA-API
      const isValid = verifyEthWalletSignature(
        smartAccountAddress, // Plain text message
        signature,
        ethAddress,
      );

      expect(isValid).toBe(true);
    });

    it("should verify signature with different case addresses", async () => {
      const ethWallet = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const smartAccountAddress = "xion1test";
      const signature = await ethWallet.signMessage(smartAccountAddress);

      // Test with uppercase address
      const upperAddress = ethWallet.address.toUpperCase();
      const isValid1 = verifyEthWalletSignature(
        smartAccountAddress,
        signature,
        upperAddress,
      );

      // Test with lowercase address
      const lowerAddress = ethWallet.address.toLowerCase();
      const isValid2 = verifyEthWalletSignature(
        smartAccountAddress,
        signature,
        lowerAddress,
      );

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });

    it("should reject invalid Ethereum signature", async () => {
      const ethWallet = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const smartAccountAddress = "xion1test";
      const wrongMessage = "xion1wrong";

      // Sign wrong message
      const signature = await ethWallet.signMessage(wrongMessage);

      // Try to verify with correct message (should fail)
      const isValid = verifyEthWalletSignature(
        smartAccountAddress, // Correct message
        signature, // Signature over wrong message
        ethWallet.address.toLowerCase(),
      );

      expect(isValid).toBe(false);
    });

    it("should reject signature from wrong Ethereum address", async () => {
      const ethWallet1 = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const ethWallet2 = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/1", // Different derivation path
      );

      const smartAccountAddress = "xion1test";

      // Sign with wallet1
      const signature = await ethWallet1.signMessage(smartAccountAddress);

      // Try to verify with wallet2's address (should fail)
      const isValid = verifyEthWalletSignature(
        smartAccountAddress,
        signature,
        ethWallet2.address.toLowerCase(), // Wrong address
      );

      expect(isValid).toBe(false);
    });

    it("should handle signature with 0x prefix", async () => {
      const ethWallet = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const smartAccountAddress = "xion1test";
      const signature = await ethWallet.signMessage(smartAccountAddress);

      // Signature from ethers.js already has 0x prefix
      expect(signature).toMatch(/^0x/);

      const isValid = verifyEthWalletSignature(
        smartAccountAddress,
        signature, // Already has 0x
        ethWallet.address.toLowerCase(),
      );

      expect(isValid).toBe(true);
    });

    it("should throw error for invalid signature format", () => {
      const ethAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const message = "test message";

      // Invalid signature (too short)
      const invalidSignature = "0xabcd1234";

      expect(() =>
        verifyEthWalletSignature(message, invalidSignature, ethAddress),
      ).toThrow(/Signature recovery failed/);
    });
  });

  describe("Cross-Verification - AA-API Format Compatibility", () => {
    it("should verify Secp256k1 signature in same format as smart contract", async () => {
      // This test ensures our signing format matches what the smart contract expects
      const { pubkeyHex, privkey, compressedPubkey } =
        await createSecp256k1Keypair(0);

      // Smart account address (what gets signed during account creation)
      const smartAccountAddress = "xion1contracttest123456789abcdefgh";
      const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

      // Sign the message: UTF-8 → SHA256
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const digest = sha256(messageBytes);
      const sig = await Secp256k1.createSignature(digest, privkey);

      // Format signature as hex (AA-API receives and verifies hex signatures)
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      const signatureHex = toHex(signatureBytes);

      // Verify with simplified format (matches AA-API verification)
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,
        signatureHex,
        pubkeyBase64,
      );

      expect(isValid).toBe(true);

      // Verify signature format matches smart contract expectations
      expect(signatureBytes.length).toBe(64); // r(32) + s(32)
      expect(compressedPubkey.length).toBe(33); // Compressed pubkey

      // Note: AA-API stores pubkey as base64 and receives hex signatures from API requests
    });

    it("should verify EthWallet signature matches AA-API format", async () => {
      const ethWallet = HDNodeWallet.fromPhrase(
        TEST_MNEMONIC,
        undefined,
        "m/44'/60'/0'/0/0",
      );

      const smartAccountAddress = "xion1ethtest123";

      // Sign exactly as AA-API expects: signMessage(string)
      // ethers.js automatically applies Ethereum signed message prefix
      const signature = await ethWallet.signMessage(smartAccountAddress);

      // Verify
      const isValid = verifyEthWalletSignature(
        smartAccountAddress,
        signature,
        ethWallet.address.toLowerCase(),
      );

      expect(isValid).toBe(true);

      // Verify signature format
      expect(signature).toMatch(/^0x[0-9a-f]{130}$/i); // r(32) + s(32) + v(1) = 65 bytes = 130 hex chars + 0x
    });
  });
});
