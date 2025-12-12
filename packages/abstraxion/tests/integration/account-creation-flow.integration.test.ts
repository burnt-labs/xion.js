/**
 * End-to-End Account Creation Flow Integration Tests
 *
 * Tests the full account creation flow from client-side through AA API
 * Verifies that:
 * - Client-side address calculation matches server-side
 * - Salt calculation is consistent across the stack
 * - Normalization functions work correctly in the full flow
 *
 * This is the heavy integration test that verifies the entire stack works together.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  calculateEthWalletSalt,
  calculateSecp256k1Salt,
  calculateSmartAccountAddress,
  normalizeEthereumAddress,
  normalizeSecp256k1PublicKey,
  AUTHENTICATOR_TYPE,
  calculateSalt,
} from "@burnt-labs/signers";

const TESTNET_AA_API_URL = "https://aa-api.xion-testnet-2.burnt.com";
const LOCAL_AA_API_URL =
  process.env.LOCAL_AA_API_URL || "http://localhost:8787";

// Test configuration - should match what's used in production
const TEST_CONFIG = {
  checksum: "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8",
  addressPrefix: "xion",
  feeGranter: "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x", // Testnet fee granter
};

describe("End-to-End Account Creation Flow", () => {
  // Skip these tests if LOCAL_AA_API_URL is not set
  const hasLocalApi = !!process.env.LOCAL_AA_API_URL;

  describe("EthWallet Full Flow", () => {
    const TEST_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

    it("should calculate same address as testnet AA API", async () => {
      // Step 1: Client-side - Normalize address (mimics createEthWalletAccount)
      const normalizedAddress = normalizeEthereumAddress(TEST_ADDRESS);
      expect(normalizedAddress).toBe(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );

      // Step 2: Client-side - Calculate salt
      const clientSalt = calculateSalt(
        AUTHENTICATOR_TYPE.EthWallet,
        normalizedAddress,
      );
      expect(clientSalt).toBe(
        "3b54f2a1226c4af7c429c9326547a09bf3a1ca36314c60cdff6edf1d3af6a55c",
      );

      // Step 3: Client-side - Calculate expected smart account address
      const clientCalculatedAddress = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: clientSalt,
        prefix: TEST_CONFIG.addressPrefix,
      });

      // Step 4: Server-side - Get address from testnet AA API
      const testnetResponse = await fetch(
        `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${TEST_ADDRESS}`,
      );
      expect(testnetResponse.ok).toBe(true);

      const testnetData = await testnetResponse.json();

      // Verify: Client calculation matches server calculation
      expect(clientCalculatedAddress).toBe(testnetData.address);
    }, 30000);

    it.skipIf(!hasLocalApi)(
      "should calculate same address as local AA API",
      async () => {
        // Client-side calculation
        const normalizedAddress = normalizeEthereumAddress(TEST_ADDRESS);
        const clientSalt = calculateSalt(
          AUTHENTICATOR_TYPE.EthWallet,
          normalizedAddress,
        );
        const clientCalculatedAddress = calculateSmartAccountAddress({
          checksum: TEST_CONFIG.checksum,
          creator: TEST_CONFIG.feeGranter,
          salt: clientSalt,
          prefix: TEST_CONFIG.addressPrefix,
        });

        // Local server calculation
        const localResponse = await fetch(
          `${LOCAL_AA_API_URL}/api/v2/account/address/ethwallet/${TEST_ADDRESS}`,
        );
        expect(localResponse.ok).toBe(true);

        const localData = await localResponse.json();

        // Verify: Client matches local server
        expect(clientCalculatedAddress).toBe(localData.address);
      },
      30000,
    );

    it("should handle backward compatibility (address without 0x prefix)", async () => {
      const addressWithoutPrefix = "742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const addressWithPrefix = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      // Both should normalize to the same value
      const normalized1 = normalizeEthereumAddress(addressWithoutPrefix);
      const normalized2 = normalizeEthereumAddress(addressWithPrefix);
      expect(normalized1).toBe(normalized2);

      // Both should produce the same salt
      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, normalized1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, normalized2);
      expect(salt1).toBe(salt2);

      // Both should produce the same smart account address
      const address1 = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: salt1,
        prefix: TEST_CONFIG.addressPrefix,
      });

      const address2 = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: salt2,
        prefix: TEST_CONFIG.addressPrefix,
      });

      expect(address1).toBe(address2);

      // Verify against testnet
      const testnetResponse = await fetch(
        `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${addressWithPrefix}`,
      );
      const testnetData = await testnetResponse.json();
      expect(address1).toBe(testnetData.address);
    }, 30000);
  });

  describe("Secp256k1 Full Flow", () => {
    const TEST_PUBKEY_HEX =
      "02e8a8f1c7b8d9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5";

    it("should calculate same address as testnet AA API", async () => {
      // Step 1: Client-side - Normalize pubkey (mimics createSecp256k1Account)
      // This converts hex to base64
      const normalizedPubkey = normalizeSecp256k1PublicKey(TEST_PUBKEY_HEX);
      expect(normalizedPubkey).toMatch(/^A[A-Za-z0-9+/]{43}$/); // Base64 format

      // Step 2: Client-side - Calculate salt from normalized pubkey
      const clientSalt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        normalizedPubkey,
      );
      expect(clientSalt).toMatch(/^[a-f0-9]{64}$/); // Hex format

      // Step 3: Client-side - Calculate expected smart account address
      const clientCalculatedAddress = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: clientSalt,
        prefix: TEST_CONFIG.addressPrefix,
      });

      // Step 4: Server-side - Get address from testnet AA API
      const testnetResponse = await fetch(
        `${TESTNET_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(TEST_PUBKEY_HEX)}`,
      );
      expect(testnetResponse.ok).toBe(true);

      const testnetData = await testnetResponse.json();

      // Verify: Client calculation matches server calculation
      expect(clientCalculatedAddress).toBe(testnetData.address);
    }, 30000);

    it.skipIf(!hasLocalApi)(
      "should calculate same address as local AA API",
      async () => {
        // Client-side calculation
        const normalizedPubkey = normalizeSecp256k1PublicKey(TEST_PUBKEY_HEX);
        const clientSalt = calculateSalt(
          AUTHENTICATOR_TYPE.Secp256K1,
          normalizedPubkey,
        );
        const clientCalculatedAddress = calculateSmartAccountAddress({
          checksum: TEST_CONFIG.checksum,
          creator: TEST_CONFIG.feeGranter,
          salt: clientSalt,
          prefix: TEST_CONFIG.addressPrefix,
        });

        // Local server calculation
        const localResponse = await fetch(
          `${LOCAL_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(TEST_PUBKEY_HEX)}`,
        );
        expect(localResponse.ok).toBe(true);

        const localData = await localResponse.json();

        // Verify: Client matches local server
        expect(clientCalculatedAddress).toBe(localData.address);
      },
      30000,
    );

    it("should handle both hex and base64 input formats", async () => {
      const hexPubkey =
        "02e8a8f1c7b8d9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5";

      // Normalize hex to base64
      const base64Pubkey = normalizeSecp256k1PublicKey(hexPubkey);

      // Both hex and base64 should normalize to the same base64
      const normalized1 = normalizeSecp256k1PublicKey(hexPubkey);
      const normalized2 = normalizeSecp256k1PublicKey(base64Pubkey);
      expect(normalized1).toBe(normalized2);

      // Both should produce the same salt
      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalized1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, normalized2);
      expect(salt1).toBe(salt2);

      // Both should produce the same smart account address
      const address1 = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: salt1,
        prefix: TEST_CONFIG.addressPrefix,
      });

      const address2 = calculateSmartAccountAddress({
        checksum: TEST_CONFIG.checksum,
        creator: TEST_CONFIG.feeGranter,
        salt: salt2,
        prefix: TEST_CONFIG.addressPrefix,
      });

      expect(address1).toBe(address2);
    });
  });

  describe("Cross-API Consistency", () => {
    it.skipIf(!hasLocalApi)(
      "should produce identical results between local and testnet for EthWallet",
      async () => {
        const testAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

        // Get from testnet
        const testnetResponse = await fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${testAddress}`,
        );
        const testnetData = await testnetResponse.json();

        // Get from local
        const localResponse = await fetch(
          `${LOCAL_AA_API_URL}/api/v2/account/address/ethwallet/${testAddress}`,
        );
        const localData = await localResponse.json();

        // Both should return the same address
        expect(localData.address).toBe(testnetData.address);
      },
      30000,
    );

    it.skipIf(!hasLocalApi)(
      "should produce identical results between local and testnet for Secp256k1",
      async () => {
        const testPubkey =
          "02e8a8f1c7b8d9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5";

        // Get from testnet
        const testnetResponse = await fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(testPubkey)}`,
        );
        const testnetData = await testnetResponse.json();

        // Get from local
        const localResponse = await fetch(
          `${LOCAL_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(testPubkey)}`,
        );
        const localData = await localResponse.json();

        // Both should return the same address
        expect(localData.address).toBe(testnetData.address);
      },
      30000,
    );
  });

  describe("Determinism and Repeatability", () => {
    it("should produce identical results across multiple calls (EthWallet)", async () => {
      const testAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

      // Call testnet API multiple times
      const responses = await Promise.all([
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${testAddress}`,
        ),
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${testAddress}`,
        ),
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/ethwallet/${testAddress}`,
        ),
      ]);

      const addresses = await Promise.all(
        responses.map((r) => r.json().then((d) => d.address)),
      );

      // All addresses should be identical
      expect(new Set(addresses).size).toBe(1);
    }, 30000);

    it("should produce identical results across multiple calls (Secp256k1)", async () => {
      const testPubkey =
        "02e8a8f1c7b8d9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5";

      // Call testnet API multiple times
      const responses = await Promise.all([
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(testPubkey)}`,
        ),
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(testPubkey)}`,
        ),
        fetch(
          `${TESTNET_AA_API_URL}/api/v2/account/address/secp256k1/${encodeURIComponent(testPubkey)}`,
        ),
      ]);

      const addresses = await Promise.all(
        responses.map((r) => r.json().then((d) => d.address)),
      );

      // All addresses should be identical
      expect(new Set(addresses).size).toBe(1);
    }, 30000);
  });
});
