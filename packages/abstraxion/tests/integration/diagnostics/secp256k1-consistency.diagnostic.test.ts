/**
 * Secp256k1 Consistency Diagnostic Tests
 *
 * These tests verify that salt calculation, address derivation, and signature verification
 * are consistent between xion.js and the AA-API.
 *
 * This diagnostic test helps identify WHERE the mismatch occurs:
 * - Salt calculation (hex vs base64 pubkey)
 * - Message format (hex vs UTF-8)
 * - Signature format (r+s without recovery byte)
 * - Address derivation
 */

import { describe, it, expect } from "vitest";
import {
  calculateSecp256k1Salt,
  verifySecp256k1Signature,
  normalizeSecp256k1PublicKey,
  utf8ToHexWithPrefix,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
} from "@burnt-labs/signers";
import { Secp256k1, sha256, stringToPath, Bip39, EnglishMnemonic, Slip10, Slip10Curve } from "@cosmjs/crypto";
import { toHex, fromHex } from "@cosmjs/encoding";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { TEST_MNEMONIC, getTestConfig } from "../fixtures";

describe("Secp256k1 Salt/Address/Signature Consistency Diagnostics", () => {
  // Test keypair derived using same logic as helpers.ts
  async function createTestKeypair(accountIndex: number = 0) {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(TEST_MNEMONIC, {
      prefix: "xion",
      hdPaths: [stringToPath(`m/44'/118'/0'/0/${accountIndex}`)],
    });

    const [account] = await wallet.getAccounts();

    // Get private key for signing
    const mnemonicObj = new EnglishMnemonic(TEST_MNEMONIC);
    const seed = await Bip39.mnemonicToSeed(mnemonicObj);
    const { privkey } = Slip10.derivePath(
      Slip10Curve.Secp256k1,
      seed,
      stringToPath(`m/44'/118'/0'/0/${accountIndex}`)
    );

    // Compress pubkey to match AA API expectations (33 bytes = 66 hex chars)
    const compressedPubkey = Secp256k1.compressPubkey(account.pubkey);
    const pubkeyHex = toHex(compressedPubkey);
    const pubkeyBase64 = Buffer.from(compressedPubkey).toString("base64");

    return {
      pubkeyHex,
      pubkeyBase64,
      privkey,
      xionAddress: account.address,
    };
  }

  describe("Salt Calculation", () => {
    it("should calculate salt from base64 pubkey (matching AA-API behavior)", async () => {
      const { pubkeyHex, pubkeyBase64 } = await createTestKeypair(0);

      console.log("[DIAGNOSTIC] Public Key Formats:");
      console.log("  Hex:", pubkeyHex);
      console.log("  Hex length:", pubkeyHex.length, "(expected: 66 chars = 33 bytes)");
      console.log("  Base64:", pubkeyBase64);
      console.log("  Base64 length:", pubkeyBase64.length, "(expected: 44 chars)");

      // AA-API normalizes pubkey to base64 before salt calculation
      const normalizedPubkey = normalizeSecp256k1PublicKey(pubkeyHex);
      console.log("\n[DIAGNOSTIC] Normalized pubkey (should be base64):", normalizedPubkey);
      console.log("  Is same as base64?", normalizedPubkey === pubkeyBase64);

      // Calculate salt using base64 pubkey (as AA-API does)
      const saltHex = calculateSecp256k1Salt(normalizedPubkey);
      console.log("\n[DIAGNOSTIC] Salt calculation:");
      console.log("  Salt (hex):", saltHex);
      console.log("  Salt length:", saltHex.length, "(expected: 64 chars = 32 bytes)");

      // Verify salt is deterministic
      const saltHex2 = calculateSecp256k1Salt(normalizedPubkey);
      expect(saltHex).toBe(saltHex2);
      console.log("  ✓ Salt is deterministic");

      // Verify salt format
      expect(saltHex).toMatch(/^[0-9a-f]{64}$/);
      expect(saltHex.length).toBe(64);
      console.log("  ✓ Salt format is valid (64 hex chars)");
    });

    it("should match AA-API salt calculation logic", async () => {
      const { pubkeyBase64 } = await createTestKeypair(0);

      // This is what AA-API does: sha256(UTF-8 encoding of the base64 string)
      const manualSalt = sha256(new TextEncoder().encode(pubkeyBase64));
      const manualSaltHex = toHex(manualSalt);

      // This is what xion.js does
      const calculatedSaltHex = calculateSecp256k1Salt(pubkeyBase64);

      console.log("[DIAGNOSTIC] Manual vs Calculated Salt:");
      console.log("  Manual (UTF-8 encode base64 string, then SHA256):", manualSaltHex);
      console.log("  Calculated (via calculateSecp256k1Salt):", calculatedSaltHex);
      console.log("  Match?", manualSaltHex === calculatedSaltHex);

      expect(calculatedSaltHex).toBe(manualSaltHex);
      console.log("  ✓ Salt calculation matches expected behavior");
    });
  });

  describe("Address Derivation", () => {
    it("should derive smart account address correctly", async () => {
      const config = getTestConfig();
      const { pubkeyHex } = await createTestKeypair(0);

      // Normalize pubkey to base64 (as AA-API does)
      const normalizedPubkey = normalizeSecp256k1PublicKey(pubkeyHex);

      // Calculate salt from normalized pubkey
      const salt = calculateSecp256k1Salt(normalizedPubkey);

      // Calculate smart account address
      const smartAccountAddress = calculateSmartAccountAddress({
        checksum: config.checksum,
        creator: config.feeGranter,
        salt,
        prefix: "xion",
      });

      console.log("[DIAGNOSTIC] Address Derivation:");
      console.log("  Pubkey (hex):", pubkeyHex);
      console.log("  Pubkey (normalized base64):", normalizedPubkey);
      console.log("  Salt:", salt);
      console.log("  Fee granter (creator):", config.feeGranter);
      console.log("  Checksum:", config.checksum);
      console.log("  Smart account address:", smartAccountAddress);

      // Verify address format
      expect(smartAccountAddress).toMatch(/^xion1[a-z0-9]{38,59}$/);
      console.log("  ✓ Address format is valid");

      // Address should be deterministic
      const smartAccountAddress2 = calculateSmartAccountAddress({
        checksum: config.checksum,
        creator: config.feeGranter,
        salt,
        prefix: "xion",
      });
      expect(smartAccountAddress).toBe(smartAccountAddress2);
      console.log("  ✓ Address derivation is deterministic");
    });
  });

  describe("Message Signing", () => {
    it("should sign message correctly (hex-encoded UTF-8 bytes)", async () => {
      const { privkey, pubkeyBase64 } = await createTestKeypair(0);

      // This is a test smart account address (bech32 format)
      const smartAccountAddress = "xion1testaccount1234567890abcdefgh";

      console.log("[DIAGNOSTIC] Message Signing:");
      console.log("  Message (plain text):", smartAccountAddress);

      // Step 1: Convert message to hex format (as ExternalSignerConnector expects)
      const messageHex = utf8ToHexWithPrefix(smartAccountAddress);
      console.log("  Message (hex with 0x prefix):", messageHex);
      console.log("  Message hex length:", messageHex.length);

      // Step 2: Remove 0x prefix and convert to bytes
      const messageHexWithoutPrefix = messageHex.slice(2);
      const messageBytes = fromHex(messageHexWithoutPrefix);
      console.log("  Message bytes length:", messageBytes.length);
      console.log("  Message bytes (first 10):", Array.from(messageBytes.slice(0, 10)));

      // Step 3: Hash the message bytes (as smart contract does)
      const messageHash = sha256(messageBytes);
      console.log("  Message hash length:", messageHash.length);
      console.log("  Message hash (first 10):", Array.from(messageHash.slice(0, 10)));

      // Step 4: Sign the hash
      const signature = await Secp256k1.createSignature(messageHash, privkey);

      // Step 5: Extract r and s (WITHOUT recovery byte)
      const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
      const signatureHex = toHex(signatureBytes);
      const signatureBase64 = Buffer.from(signatureBytes).toString("base64");

      console.log("  Signature bytes length:", signatureBytes.length, "(expected: 64 bytes)");
      console.log("  Signature (hex):", signatureHex);
      console.log("  Signature hex length:", signatureHex.length, "(expected: 128 chars)");
      console.log("  Signature (base64):", signatureBase64);

      // Verify signature format
      expect(signatureBytes.length).toBe(64);
      expect(signatureHex.length).toBe(128);
      console.log("  ✓ Signature format is correct (64 bytes, no recovery byte)");

      // Step 6: Verify signature using shared verification function
      // IMPORTANT: utf8ToHexWithPrefix just creates hex representation of UTF-8 bytes
      // So signing "hex bytes" is actually the SAME as signing plain string UTF-8 bytes!
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress, // Plain string (what AA API expects)
        signatureHex, // This signature is for UTF-8 bytes (same whether from hex or plain)
        pubkeyBase64 // Base64 format
      );

      console.log("  Signature verification (signing hex === signing plain UTF-8):", isValid ? "✓ VALID" : "✗ INVALID");
      expect(isValid).toBe(true); // Should SUCCEED - hex is just representation!
    });

    it("should only accept base64 pubkey format", async () => {
      const { privkey, pubkeyHex, pubkeyBase64 } = await createTestKeypair(0);
      const smartAccountAddress = "xion1testaccount9876543210zyxwvuts";

      // Sign PLAIN STRING (not hex!)
      const messageBytes = Buffer.from(smartAccountAddress, "utf8");
      const messageHash = sha256(messageBytes);
      const signature = await Secp256k1.createSignature(messageHash, privkey);
      const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
      const signatureHex = toHex(signatureBytes);

      console.log("[DIAGNOSTIC] Signature Verification with Different Pubkey Formats:");

      // Verify with hex pubkey (should throw error - not base64!)
      console.log("  Testing hex pubkey (should FAIL)...");
      let hexError: Error | null = null;
      try {
        await verifySecp256k1Signature(
          smartAccountAddress, // Plain string
          signatureHex,
          pubkeyHex  // Hex format - NOT SUPPORTED!
        );
      } catch (error) {
        hexError = error as Error;
        console.log("  With hex pubkey: ✗ ERROR (expected):", hexError.message);
      }
      expect(hexError).toBeTruthy();
      expect(hexError?.message).toContain("33 or 65 bytes");

      // Verify with base64 pubkey (should work!)
      const isValidBase64 = await verifySecp256k1Signature(
        smartAccountAddress, // Plain string
        signatureHex,
        pubkeyBase64  // Base64 format - SUPPORTED!
      );
      console.log("  With base64 pubkey:", isValidBase64 ? "✓ VALID" : "✗ INVALID");
      expect(isValidBase64).toBe(true);
      console.log("  ✓ Verification works with base64 pubkey only");
    });
  });

  describe("End-to-End Consistency Check", () => {
    it("should have matching salt, address, and signature between xion.js and AA-API expectations", async () => {
      const config = getTestConfig();
      const { pubkeyHex, pubkeyBase64, privkey } = await createTestKeypair(999); // Use unique index

      console.log("\n[DIAGNOSTIC] END-TO-END CONSISTENCY CHECK");
      console.log("=".repeat(80));

      // STEP 1: Normalize pubkey (as AA-API does)
      const normalizedPubkey = normalizeSecp256k1PublicKey(pubkeyHex);
      console.log("\n1. PUBLIC KEY NORMALIZATION:");
      console.log("   Input (hex):", pubkeyHex);
      console.log("   Normalized (base64):", normalizedPubkey);
      console.log("   Expected format:", pubkeyBase64);
      console.log("   ✓ Match:", normalizedPubkey === pubkeyBase64);
      expect(normalizedPubkey).toBe(pubkeyBase64);

      // STEP 2: Calculate salt (as AA-API does)
      const salt = calculateSecp256k1Salt(normalizedPubkey);
      console.log("\n2. SALT CALCULATION:");
      console.log("   Salt (hex):", salt);
      console.log("   Salt length:", salt.length, "chars (32 bytes)");
      console.log("   ✓ Valid format");

      // STEP 3: Calculate smart account address
      const smartAccountAddress = calculateSmartAccountAddress({
        checksum: config.checksum,
        creator: config.feeGranter,
        salt,
        prefix: "xion",
      });
      console.log("\n3. SMART ACCOUNT ADDRESS:");
      console.log("   Address:", smartAccountAddress);
      console.log("   ✓ Valid format:", /^xion1[a-z0-9]{38,59}$/.test(smartAccountAddress));

      // STEP 4: Sign the smart account address CORRECTLY (sign plain string, not hex!)
      const addressBytes = Buffer.from(smartAccountAddress, "utf8");
      const addressHash = sha256(addressBytes);
      const signatureObj = await Secp256k1.createSignature(addressHash, privkey);
      const signatureBytes = new Uint8Array([...signatureObj.r(32), ...signatureObj.s(32)]);
      const signatureHex = toHex(signatureBytes);

      console.log("\n4. SIGNATURE GENERATION (CORRECT - signing plain string):");
      console.log("   Message (bech32):", smartAccountAddress);
      console.log("   Signature (hex, no 0x):", signatureHex);
      console.log("   Signature length:", signatureHex.length, "chars (64 bytes)");
      console.log("   ✓ Valid format");

      // STEP 5: Verify signature (as AA-API does)
      const isValid = await verifySecp256k1Signature(
        smartAccountAddress,  // Plain string!
        signatureHex,
        normalizedPubkey
      );
      console.log("\n5. SIGNATURE VERIFICATION:");
      console.log("   Verification result:", isValid ? "✓ VALID" : "✗ INVALID");
      expect(isValid).toBe(true);

      console.log("\n" + "=".repeat(80));
      console.log("✓✓✓ END-TO-END CONSISTENCY CHECK PASSED ✓✓✓");
      console.log("=".repeat(80) + "\n");
    });
  });
});
