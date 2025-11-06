/**
 * Integration tests for AA API v2 consistency
 * 
 * These tests verify that our client-side crypto utilities (calculateSmartAccountAddress,
 * calculateSalt, prepareSignatureMessage) produce the same results as the AA API v2 endpoints.
 * 
 * This ensures consistency between client-side calculations and server-side API responses.
 * 
 * To run these tests, create a `.env.test` file in this directory with:
 * - AA_API_URL: The base URL of the AA API
 * - TEST_CHECKSUM: The contract checksum (hex string)
 * - TEST_FEE_GRANTER: The fee granter address (bech32)
 * - TEST_ADDRESS_PREFIX: The address prefix (e.g., "xion")
 * 
 * See `.env.test.example` for the required format.
 */

import {
  calculateSmartAccountAddress,
} from "@burnt-labs/signers/src/crypto/address";
import {
  calculateSalt,
  AUTHENTICATOR_TYPE,
} from "@burnt-labs/signers/src/crypto/salt";
import {
  prepareEthWalletSignature,
  prepareSecp256k1Signature,
} from "@burnt-labs/signers/src/crypto/prepare";
import {
  getAccountAddress,
  checkAccountOnChain,
} from "../src/api/client";
import { mockSaltAndAddressData } from "./mockData/saltAndAddress";

// Load environment variables from .env.test if it exists
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config({ path: require("path").join(__dirname, ".env.test") });
} catch {
  // dotenv not available or .env.test doesn't exist - use process.env directly
}

// Test configuration - required environment variables
const AA_API_URL = process.env.AA_API_URL;
const TEST_CHECKSUM = process.env.TEST_CHECKSUM;
const TEST_FEE_GRANTER = process.env.TEST_FEE_GRANTER;
const TEST_ADDRESS_PREFIX = process.env.TEST_ADDRESS_PREFIX || "xion";

// Test data
const TEST_ETH_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
const TEST_ETH_ADDRESS_LOWERCASE = TEST_ETH_ADDRESS.toLowerCase();
const TEST_SECP256K1_PUBKEY = "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F";
const TEST_JWT_IDENTIFIER = "google.com.user123456789";

describe("AA API v2 Integration Tests", () => {
  describe("Address Calculation Consistency", () => {
    beforeAll(() => {
      if (!AA_API_URL || !TEST_CHECKSUM || !TEST_FEE_GRANTER) {
        throw new Error(
          "Missing required environment variables. Create a .env.test file with AA_API_URL, TEST_CHECKSUM, and TEST_FEE_GRANTER. See .env.test.example for format."
        );
      }
    });

    it("should calculate EthWallet address matching API response", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS_LOWERCASE);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      // Get address from API
      const apiResponse = await getAccountAddress(
        apiUrl,
        AUTHENTICATOR_TYPE.EthWallet,
        TEST_ETH_ADDRESS_LOWERCASE
      );

      // Compare results
      expect(calculatedAddress).toBe(apiResponse.address);
      expect(apiResponse.authenticator_type).toBe("EthWallet");
    });

    it("should calculate Secp256k1 address matching API response", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, TEST_SECP256K1_PUBKEY);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      // Get address from API
      const apiResponse = await getAccountAddress(
        apiUrl,
        AUTHENTICATOR_TYPE.Secp256K1,
        TEST_SECP256K1_PUBKEY
      );

      // Compare results
      expect(calculatedAddress).toBe(apiResponse.address);
      expect(apiResponse.authenticator_type).toBe("Secp256K1");
    });

    it("should calculate JWT address matching API response", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.JWT, TEST_JWT_IDENTIFIER);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      // Get address from API
      const apiResponse = await getAccountAddress(
        apiUrl,
        AUTHENTICATOR_TYPE.JWT,
        TEST_JWT_IDENTIFIER
      );

      // Compare results
      expect(calculatedAddress).toBe(apiResponse.address);
      expect(apiResponse.authenticator_type).toBe("JWT");
    });

    it("should handle EthWallet address with 0x prefix consistently", async () => {
      // Type assertions - checked in beforeAll
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Test with 0x prefix
      const saltWithPrefix = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS);
      const addressWithPrefix = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: saltWithPrefix,
        prefix: TEST_ADDRESS_PREFIX,
      });

      // Test without 0x prefix
      const saltWithoutPrefix = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS_LOWERCASE);
      const addressWithoutPrefix = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: saltWithoutPrefix,
        prefix: TEST_ADDRESS_PREFIX,
      });

      // Both should produce the same address (salt calculation normalizes the address)
      expect(addressWithPrefix).toBe(addressWithoutPrefix);
    });
  });

  describe("Signature Message Preparation", () => {
    beforeAll(() => {
      if (!TEST_CHECKSUM || !TEST_FEE_GRANTER) {
        throw new Error(
          "Missing required environment variables. Create a .env.test file with TEST_CHECKSUM and TEST_FEE_GRANTER. See .env.test.example for format."
        );
      }
    });

    it("should prepare EthWallet signature message correctly", () => {
      // Type assertions - checked in beforeAll
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      const prepareResult = prepareEthWalletSignature(TEST_ETH_ADDRESS, {
        checksum,
        feeGranter,
        addressPrefix: TEST_ADDRESS_PREFIX,
      });

      // Message to sign should be the calculated address
      expect(prepareResult.messageToSign).toBe(prepareResult.calculatedAddress);
      
      // Should have correct metadata
      expect(prepareResult.metadata.wallet_type).toBe(AUTHENTICATOR_TYPE.EthWallet);
      expect(prepareResult.metadata.address).toBe(TEST_ETH_ADDRESS);
      expect(prepareResult.metadata.action).toBe("create_abstraxion_account");
      
      // Salt should be calculated correctly
      const expectedSalt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS);
      expect(prepareResult.salt).toBe(expectedSalt);
      
      // Address should match calculated address
      const expectedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: expectedSalt,
        prefix: TEST_ADDRESS_PREFIX,
      });
      expect(prepareResult.calculatedAddress).toBe(expectedAddress);
    });

    it("should prepare Secp256k1 signature message correctly", () => {
      // Type assertions - checked in beforeAll
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      const prepareResult = prepareSecp256k1Signature(TEST_SECP256K1_PUBKEY, {
        checksum,
        feeGranter,
        addressPrefix: TEST_ADDRESS_PREFIX,
      });

      // Message to sign should be the calculated address
      expect(prepareResult.messageToSign).toBe(prepareResult.calculatedAddress);
      
      // Should have correct metadata
      expect(prepareResult.metadata.wallet_type).toBe(AUTHENTICATOR_TYPE.Secp256K1);
      expect(prepareResult.metadata.pubkey).toBe(TEST_SECP256K1_PUBKEY);
      expect(prepareResult.metadata.action).toBe("create_abstraxion_account");
      
      // Salt should be calculated correctly
      const expectedSalt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, TEST_SECP256K1_PUBKEY);
      expect(prepareResult.salt).toBe(expectedSalt);
      
      // Address should match calculated address
      const expectedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: expectedSalt,
        prefix: TEST_ADDRESS_PREFIX,
      });
      expect(prepareResult.calculatedAddress).toBe(expectedAddress);
    });
  });

  describe("Account Check Endpoint Consistency", () => {
    beforeAll(() => {
      if (!AA_API_URL || !TEST_CHECKSUM || !TEST_FEE_GRANTER) {
        throw new Error(
          "Missing required environment variables. Create a .env.test file with AA_API_URL, TEST_CHECKSUM, and TEST_FEE_GRANTER. See .env.test.example for format."
        );
      }
    });

    it("should handle account check for EthWallet", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS_LOWERCASE);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      try {
        // Check if account exists on-chain
        const checkResponse = await checkAccountOnChain(
          apiUrl,
          AUTHENTICATOR_TYPE.EthWallet,
          TEST_ETH_ADDRESS_LOWERCASE
        );

        // If account exists, address should match
        expect(checkResponse.address).toBe(calculatedAddress);
        expect(checkResponse.authenticatorType).toBe("EthWallet");
        expect(typeof checkResponse.codeId).toBe("number");
      } catch (error: any) {
        // Account might not exist (404), which is fine for this test
        if (error.message !== "ACCOUNT_NOT_FOUND") {
          throw error;
        }
        // Account doesn't exist - this is expected for test addresses
      }
    });

    it("should handle account check for Secp256k1", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, TEST_SECP256K1_PUBKEY);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      try {
        // Check if account exists on-chain
        const checkResponse = await checkAccountOnChain(
          apiUrl,
          AUTHENTICATOR_TYPE.Secp256K1,
          TEST_SECP256K1_PUBKEY
        );

        // If account exists, address should match
        expect(checkResponse.address).toBe(calculatedAddress);
        expect(checkResponse.authenticatorType).toBe("Secp256K1");
        expect(typeof checkResponse.codeId).toBe("number");
      } catch (error: any) {
        // Account might not exist (404), which is fine for this test
        if (error.message !== "ACCOUNT_NOT_FOUND") {
          throw error;
        }
        // Account doesn't exist - this is expected for test addresses
      }
    });

    it("should handle account check for JWT", async () => {
      // Type assertions - checked in beforeAll
      const apiUrl = AA_API_URL!;
      const checksum = TEST_CHECKSUM!;
      const feeGranter = TEST_FEE_GRANTER!;

      // Calculate address locally
      const salt = calculateSalt(AUTHENTICATOR_TYPE.JWT, TEST_JWT_IDENTIFIER);
      const calculatedAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt,
        prefix: TEST_ADDRESS_PREFIX,
      });

      try {
        // Check if account exists on-chain
        const checkResponse = await checkAccountOnChain(
          apiUrl,
          AUTHENTICATOR_TYPE.JWT,
          TEST_JWT_IDENTIFIER
        );

        // If account exists, address should match
        expect(checkResponse.address).toBe(calculatedAddress);
        expect(checkResponse.authenticatorType).toBe("JWT");
        expect(typeof checkResponse.codeId).toBe("number");
      } catch (error: any) {
        // Account might not exist (404), which is fine for this test
        if (error.message !== "ACCOUNT_NOT_FOUND") {
          throw error;
        }
        // Account doesn't exist - this is expected for test addresses
      }
    });
  });

  describe("Salt Calculation Consistency", () => {
    it("should calculate EthWallet salt correctly", () => {
      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS_LOWERCASE);
      
      // Log salt values for reference
      console.log("EthWallet salt (with 0x):", salt1);
      console.log("EthWallet salt (lowercase):", salt2);
      
      // Salt should be the same regardless of 0x prefix or case
      expect(salt1).toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/); // Should be 64 hex characters
    });

    it("should calculate Secp256k1 salt correctly", () => {
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, TEST_SECP256K1_PUBKEY);
      
      // Log salt value for reference
      console.log("Secp256k1 salt:", salt);
      
      expect(salt).toMatch(/^[0-9a-f]{64}$/); // Should be 64 hex characters
    });

    it("should calculate JWT salt correctly", () => {
      const salt = calculateSalt(AUTHENTICATOR_TYPE.JWT, TEST_JWT_IDENTIFIER);
      
      // Log salt value for reference
      console.log("JWT salt:", salt);
      
      expect(salt).toMatch(/^[0-9a-f]{64}$/); // Should be 64 hex characters
    });

    it("should match expected salt values from mock data", () => {
      // Calculate salts for mock data inputs
      const ethSalt = calculateSalt(
        AUTHENTICATOR_TYPE.EthWallet,
        mockSaltAndAddressData.ethWallet.address
      );
      const secpSalt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        mockSaltAndAddressData.secp256k1.pubkey
      );
      const jwtSalt = calculateSalt(
        AUTHENTICATOR_TYPE.JWT,
        mockSaltAndAddressData.jwt.identifier
      );

      // Log calculated values
      console.log("Mock EthWallet salt:", ethSalt);
      console.log("Mock Secp256k1 salt:", secpSalt);
      console.log("Mock JWT salt:", jwtSalt);

      // If expected values are set in mock data, verify they match
      if (mockSaltAndAddressData.ethWallet.expectedSalt) {
        expect(ethSalt).toBe(mockSaltAndAddressData.ethWallet.expectedSalt);
      }
      if (mockSaltAndAddressData.secp256k1.expectedSalt) {
        expect(secpSalt).toBe(mockSaltAndAddressData.secp256k1.expectedSalt);
      }
      if (mockSaltAndAddressData.jwt.expectedSalt) {
        expect(jwtSalt).toBe(mockSaltAndAddressData.jwt.expectedSalt);
      }

      // Verify format
      expect(ethSalt).toMatch(/^[0-9a-f]{64}$/);
      expect(secpSalt).toMatch(/^[0-9a-f]{64}$/);
      expect(jwtSalt).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate expected address from mock data", () => {
      // Only calculate addresses if we have valid config values (not placeholders)
      if (!TEST_CHECKSUM || !TEST_FEE_GRANTER) {
        console.log("Skipping address calculation - missing TEST_CHECKSUM or TEST_FEE_GRANTER");
        return;
      }

      const checksum = TEST_CHECKSUM;
      const feeGranter = TEST_FEE_GRANTER;
      const addressPrefix = TEST_ADDRESS_PREFIX || mockSaltAndAddressData.ethWallet.config.addressPrefix;

      // Calculate salt and address for EthWallet
      const ethSalt = calculateSalt(
        AUTHENTICATOR_TYPE.EthWallet,
        mockSaltAndAddressData.ethWallet.address
      );
      const ethAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: ethSalt,
        prefix: addressPrefix,
      });

      // Calculate salt and address for Secp256k1
      const secpSalt = calculateSalt(
        AUTHENTICATOR_TYPE.Secp256K1,
        mockSaltAndAddressData.secp256k1.pubkey
      );
      const secpAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: secpSalt,
        prefix: addressPrefix,
      });

      // Calculate salt and address for JWT
      const jwtSalt = calculateSalt(
        AUTHENTICATOR_TYPE.JWT,
        mockSaltAndAddressData.jwt.identifier
      );
      const jwtAddress = calculateSmartAccountAddress({
        checksum,
        creator: feeGranter,
        salt: jwtSalt,
        prefix: addressPrefix,
      });

      // Log calculated values for reference
      console.log("Mock EthWallet address:", ethAddress);
      console.log("Mock Secp256k1 address:", secpAddress);
      console.log("Mock JWT address:", jwtAddress);

      // If expected values are set in mock data, verify they match
      if (mockSaltAndAddressData.ethWallet.expectedAddress) {
        expect(ethAddress).toBe(mockSaltAndAddressData.ethWallet.expectedAddress);
      }
      if (mockSaltAndAddressData.secp256k1.expectedAddress) {
        expect(secpAddress).toBe(mockSaltAndAddressData.secp256k1.expectedAddress);
      }
      if (mockSaltAndAddressData.jwt.expectedAddress) {
        expect(jwtAddress).toBe(mockSaltAndAddressData.jwt.expectedAddress);
      }

      // Verify addresses are valid bech32 format
      expect(ethAddress).toMatch(/^xion1[a-z0-9]{38,59}$/);
      expect(secpAddress).toMatch(/^xion1[a-z0-9]{38,59}$/);
      expect(jwtAddress).toMatch(/^xion1[a-z0-9]{38,59}$/);
    });
  });

  describe("Salt Calculation Unit Tests (No API Required)", () => {
    it("should calculate deterministic salt for EthWallet addresses", () => {
      const address1 = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const address2 = "742d35cc6634c0532925a3b844bc9e7595f0beb0";
      const address3 = "0x742d35cc6634c0532925a3b844bc9e7595f0beb0";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, address1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, address2);
      const salt3 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, address3);

      // All variations should produce the same salt (normalized)
      expect(salt1).toBe(salt2);
      expect(salt2).toBe(salt3);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate different salts for different EthWallet addresses", () => {
      const address1 = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      const address2 = "0x1234567890123456789012345678901234567890";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, address1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, address2);

      expect(salt1).not.toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
      expect(salt2).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate deterministic salt for Secp256k1 pubkeys", () => {
      const pubkey1 = "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F";
      const pubkey2 = "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkey1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkey2);

      expect(salt1).toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate different salts for different Secp256k1 pubkeys", () => {
      const pubkey1 = "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F";
      const pubkey2 = "B04D7F9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A9A5A";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkey1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkey2);

      expect(salt1).not.toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
      expect(salt2).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate deterministic salt for JWT identifiers", () => {
      const jwt1 = "google.com.user123456789";
      const jwt2 = "google.com.user123456789";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt2);

      expect(salt1).toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should calculate different salts for different JWT identifiers", () => {
      const jwt1 = "google.com.user123456789";
      const jwt2 = "tiktok.com.user987654321";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt2);

      expect(salt1).not.toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
      expect(salt2).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle case-sensitive JWT identifiers correctly", () => {
      const jwt1 = "Google.com.User123";
      const jwt2 = "google.com.user123";

      const salt1 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt1);
      const salt2 = calculateSalt(AUTHENTICATOR_TYPE.JWT, jwt2);

      // JWT identifiers are case-sensitive, so salts should differ
      expect(salt1).not.toBe(salt2);
      expect(salt1).toMatch(/^[0-9a-f]{64}$/);
      expect(salt2).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should produce consistent salt format across all authenticator types", () => {
      const ethSalt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, TEST_ETH_ADDRESS);
      const secpSalt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, TEST_SECP256K1_PUBKEY);
      const jwtSalt = calculateSalt(AUTHENTICATOR_TYPE.JWT, TEST_JWT_IDENTIFIER);

      // All salts should be 64 hex characters
      expect(ethSalt).toMatch(/^[0-9a-f]{64}$/);
      expect(secpSalt).toMatch(/^[0-9a-f]{64}$/);
      expect(jwtSalt).toMatch(/^[0-9a-f]{64}$/);

      // All salts should be different (different inputs)
      expect(ethSalt).not.toBe(secpSalt);
      expect(secpSalt).not.toBe(jwtSalt);
      expect(ethSalt).not.toBe(jwtSalt);
    });

    it("should handle empty string inputs gracefully", () => {
      expect(() => {
        calculateSalt(AUTHENTICATOR_TYPE.EthWallet, "");
      }).not.toThrow();

      expect(() => {
        calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, "");
      }).not.toThrow();

      expect(() => {
        calculateSalt(AUTHENTICATOR_TYPE.JWT, "");
      }).not.toThrow();
    });

    it("should handle Passkey authenticator type", () => {
      const credentialId = "passkey:credential123";
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Passkey, credentialId);

      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle Ed25519 authenticator type", () => {
      const pubkey = "Ed25519PublicKey123456789012345678901234567890";
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Ed25519, pubkey);

      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle Sr25519 authenticator type", () => {
      const pubkey = "Sr25519PublicKey123456789012345678901234567890";
      const salt = calculateSalt(AUTHENTICATOR_TYPE.Sr25519, pubkey);

      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

