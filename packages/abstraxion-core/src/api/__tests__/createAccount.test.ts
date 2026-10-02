/**
 * 🔴 CRITICAL: Account Creation Tests
 *
 * Tests for high-level account creation functions
 * Focuses on validation logic (address calculation is tested in @burnt-labs/signers)
 * API endpoints are tested in @account-abstraction-api/tests/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createEthWalletAccount,
  createSecp256k1Account,
} from "../createAccount";
import {
  calculateSalt,
  calculateSmartAccountAddress,
  AUTHENTICATOR_TYPE,
  utf8ToHexWithPrefix,
} from "@burnt-labs/signers";
import {
  ETH_WALLET_TEST_DATA,
  SECP256K1_TEST_DATA,
  TEST_ADDRESSES,
} from "@burnt-labs/test-utils";

describe("createAccount - Validation Logic", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("🔴 CRITICAL: createEthWalletAccount - feeGranter Validation", () => {
    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();

      await expect(
        createEthWalletAccount(
          "http://test-api",
          ETH_WALLET_TEST_DATA.address,
          signMessageFn,
          ETH_WALLET_TEST_DATA.config.checksum,
          "cosmos1invalidprefix", // Wrong prefix
          "xion", // Expected prefix
        ),
      ).rejects.toThrow(
        'feeGranter address "cosmos1invalidprefix" must start with addressPrefix "xion"',
      );

      expect(signMessageFn).not.toHaveBeenCalled();
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          account_address: "xion1test",
          transaction_hash: "hash123",
        }),
      });

      await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      expect(signMessageFn).toHaveBeenCalled();
      // Verify that signMessageFn was called with hex format (0x prefix)
      const callArgs = signMessageFn.mock.calls[0][0];
      expect(callArgs).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(callArgs.startsWith("0x")).toBe(true);
    });
  });

  describe("🔴 CRITICAL: createSecp256k1Account - feeGranter Validation", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";

    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();

      await expect(
        createSecp256k1Account(
          "http://test-api",
          validPubkeyHex,
          signMessageFn,
          SECP256K1_TEST_DATA.config.checksum,
          "cosmos1invalidprefix",
          "xion",
        ),
      ).rejects.toThrow(
        'feeGranter address "cosmos1invalidprefix" must start with addressPrefix "xion"',
      );

      expect(signMessageFn).not.toHaveBeenCalled();
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      // Valid base64 signature (standard base64, no special chars that might cause issues)
      const validBase64Sig =
        "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          account_address: "xion1test",
          transaction_hash: "hash123",
        }),
      });

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      expect(signMessageFn).toHaveBeenCalled();
      // Verify that signMessageFn was called with hex format (0x prefix)
      const callArgs = signMessageFn.mock.calls[0][0];
      expect(callArgs).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(callArgs.startsWith("0x")).toBe(true);
    });
  });

  describe("Address Lowercase Conversion", () => {
    it("should convert ethereum address to lowercase in API call", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          account_address: "xion1test",
          transaction_hash: "hash123",
        }),
      });
      global.fetch = mockFetch;

      await createEthWalletAccount(
        "http://test-api",
        "0x742D35Cc6634C0532925a3b844Bc9e7595f0bEb0", // Mixed case
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.address).toBe(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );
    });
  });
  describe("Chain-resolved checksum", () => {
    const CHAIN_HASH =
      "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8";

    const expectedEthAddress = () =>
      calculateSmartAccountAddress({
        checksum: CHAIN_HASH,
        creator: TEST_ADDRESSES.account,
        salt: calculateSalt(
          AUTHENTICATOR_TYPE.EthWallet,
          ETH_WALLET_TEST_DATA.addressLowercase,
        ),
        prefix: "xion",
      });

    it("resolves a function checksum and signs the address derived from it", async () => {
      const resolveChecksum = vi.fn().mockResolvedValue(CHAIN_HASH);
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      const expected = expectedEthAddress();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account_address: expected }),
      });

      const result = await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        signMessageFn,
        resolveChecksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      expect(resolveChecksum).toHaveBeenCalledOnce();
      expect(signMessageFn).toHaveBeenCalledWith(utf8ToHexWithPrefix(expected));
      expect(result.account_address).toBe(expected);
    });

    it("does not sign anything when checksum resolution fails", async () => {
      const signMessageFn = vi.fn();
      global.fetch = vi.fn();

      await expect(
        createEthWalletAccount(
          "http://test-api",
          ETH_WALLET_TEST_DATA.address,
          signMessageFn,
          () => Promise.reject(new Error("checksum mismatch")),
          TEST_ADDRESSES.account,
          "xion",
        ),
      ).rejects.toThrow("checksum mismatch");
      expect(signMessageFn).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("warns when the AA API returns a different (e.g. pre-v31) account", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account_address: "xion1legacyaccount" }),
      });

      const result = await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        vi.fn().mockResolvedValue("0xsignature"),
        CHAIN_HASH,
        TEST_ADDRESSES.account,
        "xion",
      );

      expect(result.account_address).toBe("xion1legacyaccount");
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(expectedEthAddress()),
      );
    });
  });
});
