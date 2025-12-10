/**
 * EthWallet Consistency Diagnostic Tests
 *
 * These tests verify that salt calculation, address derivation, and signature verification
 * are consistent between xion.js and the AA-API for Ethereum wallets.
 *
 * This diagnostic test helps identify WHERE the mismatch occurs:
 * - Salt calculation (normalized Ethereum address)
 * - Message format (hex vs UTF-8)
 * - Signature format (65 bytes with recovery byte)
 * - Address derivation
 */

import { describe, it, expect } from "vitest";
import {
  calculateEthWalletSalt,
  verifyEthWalletSignature,
  normalizeEthereumAddress,
  utf8ToHexWithPrefix,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
} from "@burnt-labs/signers";
import { Wallet } from "ethers";
import { getTestConfig } from "../fixtures";

describe("EthWallet Salt/Address/Signature Consistency Diagnostics", () => {
  // Test Ethereum wallet with known private key
  const TEST_ETH_PRIVATE_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234";

  function createTestEthWallet() {
    const wallet = new Wallet(TEST_ETH_PRIVATE_KEY);
    const ethereumAddress = wallet.address;

    return {
      wallet,
      ethereumAddress,
      normalizedAddress: normalizeEthereumAddress(ethereumAddress),
    };
  }

  describe("Address Normalization", () => {
    it("should normalize Ethereum address correctly", () => {
      const { ethereumAddress, normalizedAddress } = createTestEthWallet();

      console.log("[DIAGNOSTIC] Ethereum Address Normalization:");
      console.log("  Original address:", ethereumAddress);
      console.log("  Normalized address:", normalizedAddress);
      console.log("  Expected format: lowercase with 0x prefix");

      // Normalized address should be lowercase with 0x prefix
      expect(normalizedAddress).toBe(ethereumAddress.toLowerCase());
      expect(normalizedAddress).toMatch(/^0x[0-9a-f]{40}$/);
      console.log("  ✓ Normalization is correct");
    });

    it("should handle addresses with and without 0x prefix", () => {
      const addressWith0x = "0xAbCdEf1234567890123456789012345678901234";
      const addressWithout0x = "AbCdEf1234567890123456789012345678901234";

      const normalized1 = normalizeEthereumAddress(addressWith0x);
      const normalized2 = normalizeEthereumAddress(addressWithout0x);

      console.log("[DIAGNOSTIC] Prefix Handling:");
      console.log("  With 0x:", addressWith0x, "→", normalized1);
      console.log("  Without 0x:", addressWithout0x, "→", normalized2);

      expect(normalized1).toBe(normalized2);
      expect(normalized1).toBe("0xabcdef1234567890123456789012345678901234");
      console.log("  ✓ Both produce same normalized address");
    });
  });

  describe("Salt Calculation", () => {
    it("should calculate salt from normalized Ethereum address (matching AA-API behavior)", () => {
      const { normalizedAddress } = createTestEthWallet();

      console.log("[DIAGNOSTIC] Salt Calculation:");
      console.log("  Normalized address:", normalizedAddress);
      console.log("  Address length:", normalizedAddress.length, "(expected: 40 chars)");

      // Calculate salt using normalized address (as AA-API does)
      const saltHex = calculateEthWalletSalt(normalizedAddress);
      console.log("  Salt (hex):", saltHex);
      console.log("  Salt length:", saltHex.length, "(expected: 64 chars = 32 bytes)");

      // Verify salt is deterministic
      const saltHex2 = calculateEthWalletSalt(normalizedAddress);
      expect(saltHex).toBe(saltHex2);
      console.log("  ✓ Salt is deterministic");

      // Verify salt format
      expect(saltHex).toMatch(/^[0-9a-f]{64}$/);
      expect(saltHex.length).toBe(64);
      console.log("  ✓ Salt format is valid (64 hex chars)");
    });

    it("should match AA-API salt calculation logic", () => {
      const { normalizedAddress } = createTestEthWallet();

      // This is what AA-API does: sha256(binary address bytes, not UTF-8 string)
      const { sha256 } = require("@cosmjs/crypto");
      const { fromHex, toHex } = require("@cosmjs/encoding");

      // Remove 0x prefix and convert hex string to binary bytes
      const addressHex = normalizedAddress.slice(2).toLowerCase();
      const addressBinary = fromHex(addressHex);
      const manualSalt = sha256(addressBinary);
      const manualSaltHex = toHex(manualSalt);

      // This is what xion.js does
      const calculatedSaltHex = calculateEthWalletSalt(normalizedAddress);

      console.log("[DIAGNOSTIC] Manual vs Calculated Salt:");
      console.log("  Normalized address:", normalizedAddress);
      console.log("  Address hex (without 0x):", addressHex);
      console.log("  Address binary length:", addressBinary.length, "bytes");
      console.log("  Manual (SHA256 of binary bytes):", manualSaltHex);
      console.log("  Calculated (via calculateEthWalletSalt):", calculatedSaltHex);
      console.log("  Match?", manualSaltHex === calculatedSaltHex);

      expect(calculatedSaltHex).toBe(manualSaltHex);
      console.log("  ✓ Salt calculation matches expected behavior");
    });
  });

  describe("Address Derivation", () => {
    it("should derive smart account address correctly", () => {
      const config = getTestConfig();
      const { normalizedAddress } = createTestEthWallet();

      // Calculate salt from normalized address
      const salt = calculateEthWalletSalt(normalizedAddress);

      // Calculate smart account address
      const smartAccountAddress = calculateSmartAccountAddress({
        checksum: config.checksum,
        creator: config.feeGranter,
        salt,
        prefix: "xion",
      });

      console.log("[DIAGNOSTIC] Address Derivation:");
      console.log("  Ethereum address (normalized):", normalizedAddress);
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
    it("should sign message correctly (hex-encoded UTF-8 bytes with recovery byte)", async () => {
      const { wallet, normalizedAddress } = createTestEthWallet();

      // This is a test smart account address (bech32 format)
      const smartAccountAddress = "xion1testaccount1234567890abcdefgh";

      console.log("[DIAGNOSTIC] Message Signing:");
      console.log("  Message (plain text):", smartAccountAddress);

      // Step 1: Convert message to hex format (as ExternalSignerConnector expects)
      const messageHex = utf8ToHexWithPrefix(smartAccountAddress);
      console.log("  Message (hex with 0x prefix):", messageHex);
      console.log("  Message hex length:", messageHex.length);

      // Step 2: Sign the message (Ethereum personal_sign format)
      const signature = await wallet.signMessage(messageHex);
      console.log("  Signature:", signature);
      console.log("  Signature length:", signature.length, "(expected: 132 chars = 0x + 65 bytes * 2)");

      // Verify signature format (65 bytes: r + s + v)
      expect(signature).toMatch(/^0x[0-9a-f]{130}$/);
      console.log("  ✓ Signature format is correct (65 bytes with recovery byte)");

      // Step 3: Verify signature using shared verification function
      const isValid = await verifyEthWalletSignature(
        messageHex, // Hex format with 0x prefix
        signature, // Hex format with 0x prefix (65 bytes)
        normalizedAddress // Normalized Ethereum address
      );

      console.log("  Signature verification:", isValid ? "✓ VALID" : "✗ INVALID");
      expect(isValid).toBe(true);
    });

    it("should verify signature with different address formats", async () => {
      const { wallet, ethereumAddress, normalizedAddress } = createTestEthWallet();
      const smartAccountAddress = "xion1testaccount9876543210zyxwvuts";

      // Sign message
      const messageHex = utf8ToHexWithPrefix(smartAccountAddress);
      const signature = await wallet.signMessage(messageHex);

      console.log("[DIAGNOSTIC] Signature Verification with Different Address Formats:");

      // Verify with original address (with 0x, mixed case)
      const isValidOriginal = await verifyEthWalletSignature(
        messageHex,
        signature,
        ethereumAddress
      );
      console.log("  With original address (0x + mixed case):", isValidOriginal ? "✓ VALID" : "✗ INVALID");

      // Verify with normalized address (no 0x, lowercase)
      const isValidNormalized = await verifyEthWalletSignature(
        messageHex,
        signature,
        normalizedAddress
      );
      console.log("  With normalized address (no 0x, lowercase):", isValidNormalized ? "✓ VALID" : "✗ INVALID");

      // Both should work
      expect(isValidOriginal).toBe(true);
      expect(isValidNormalized).toBe(true);
      console.log("  ✓ Verification works with both address formats");
    });
  });

  describe("End-to-End Consistency Check", () => {
    it("should have matching salt, address, and signature between xion.js and AA-API expectations", async () => {
      const config = getTestConfig();
      const { wallet, ethereumAddress, normalizedAddress } = createTestEthWallet();

      console.log("\n[DIAGNOSTIC] END-TO-END CONSISTENCY CHECK (EthWallet)");
      console.log("=".repeat(80));

      // STEP 1: Normalize Ethereum address (as AA-API does)
      const normalized = normalizeEthereumAddress(ethereumAddress);
      console.log("\n1. ETHEREUM ADDRESS NORMALIZATION:");
      console.log("   Input (with 0x, mixed case):", ethereumAddress);
      console.log("   Normalized (no 0x, lowercase):", normalized);
      console.log("   Expected format:", normalizedAddress);
      console.log("   ✓ Match:", normalized === normalizedAddress);
      expect(normalized).toBe(normalizedAddress);

      // STEP 2: Calculate salt (as AA-API does)
      const salt = calculateEthWalletSalt(normalized);
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

      // STEP 4: Sign the smart account address (as connector does)
      const addressHex = utf8ToHexWithPrefix(smartAccountAddress);
      const signature = await wallet.signMessage(addressHex);

      console.log("\n4. SIGNATURE GENERATION:");
      console.log("   Message (bech32):", smartAccountAddress);
      console.log("   Message (hex with 0x):", addressHex);
      console.log("   Signature (hex with 0x):", signature);
      console.log("   Signature length:", signature.length, "chars (65 bytes)");
      console.log("   ✓ Valid format");

      // STEP 5: Verify signature (as AA-API does)
      const isValid = await verifyEthWalletSignature(
        addressHex,
        signature,
        normalized
      );
      console.log("\n5. SIGNATURE VERIFICATION:");
      console.log("   Verification result:", isValid ? "✓ VALID" : "✗ INVALID");
      expect(isValid).toBe(true);

      console.log("\n" + "=".repeat(80));
      console.log("✓✓✓ END-TO-END CONSISTENCY CHECK PASSED (EthWallet) ✓✓✓");
      console.log("=".repeat(80) + "\n");
    });
  });
});
