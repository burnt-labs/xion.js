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
  ETH_WALLET_TEST_DATA,
  SECP256K1_TEST_DATA,
  TEST_ADDRESSES,
} from "@burnt-labs/test-utils";

describe("createAccount - Validation Logic", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  /**
   * URL-aware fetch mock: answers the v2 address endpoint (GET) and the
   * create endpoint (POST) separately. `apiAddress: undefined` makes the
   * address endpoint fail (500) to exercise the local-derivation fallback.
   */
  function mockFetchRouting(apiAddress: string | undefined) {
    return vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url).includes("/api/v2/account/address/")) {
        if (apiAddress === undefined) {
          return {
            ok: false,
            status: 500,
            text: async () => "address endpoint down",
          };
        }
        return {
          ok: true,
          json: async () => ({
            address: apiAddress,
            authenticator_type: "Secp256K1",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          account_address: "xion1test",
          transaction_hash: "hash123",
        }),
      };
    });
  }

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

      // The create POST is the call that carries a body (an address GET may
      // precede it) — don't rely on call order.
      const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.body);
      expect(postCall).toBeDefined();
      const callBody = JSON.parse(postCall![1].body);
      expect(callBody.address).toBe(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );
    });
  });

  describe("🔴 CRITICAL: API-authoritative address resolution", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";
    const validBase64Sig =
      "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";

    it("signs the address returned by the AA API (not the local derivation) and warns on mismatch", async () => {
      const apiAddress = "xion1apiauthoritativeaddress";
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = mockFetchRouting(apiAddress);

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      // Signed message is hex of the API's address, byte for byte.
      const signedHex = signMessageFn.mock.calls[0][0] as string;
      const signedUtf8 = Buffer.from(signedHex.slice(2), "hex").toString(
        "utf8",
      );
      expect(signedUtf8).toBe(apiAddress);
      // Local derivation from test config can't equal the fabricated API
      // address, so the stale-config warning must fire.
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("likely stale"),
      );
    });

    it("falls back to the locally derived address when the address endpoint fails", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = mockFetchRouting(undefined); // address endpoint 500s

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      // Still signs *something* (the local derivation) and completes create.
      const signedHex = signMessageFn.mock.calls[0][0] as string;
      const signedUtf8 = Buffer.from(signedHex.slice(2), "hex").toString(
        "utf8",
      );
      expect(signedUtf8).toMatch(/^xion1/);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("address endpoint unavailable"),
        expect.anything(),
      );
    });

    it("propagates a requested codeId to both the address GET and the create POST", async () => {
      const apiAddress = "xion1apiauthoritativeaddress";
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockFetchRouting(apiAddress);
      global.fetch = mockFetch;

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
        undefined, // rpcUrl
        "21", // requested code id
      );

      const urls = mockFetch.mock.calls.map(([url]) => String(url));
      expect(
        urls.some(
          (u) => u.includes("/account/address/") && u.includes("code_id=21"),
        ),
      ).toBe(true);
      const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.body);
      expect(JSON.parse(postCall![1].body).code_id).toBe("21");
    });

    it("omits code_id entirely when not requested", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockFetchRouting("xion1apiaddr");
      global.fetch = mockFetch;

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      const urls = mockFetch.mock.calls.map(([url]) => String(url));
      expect(urls.some((u) => u.includes("code_id="))).toBe(false);
      const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.body);
      expect(JSON.parse(postCall![1].body)).not.toHaveProperty("code_id");
    });

    it("signs the ethwallet address returned by the AA API", async () => {
      const apiAddress = "xion1ethapiaddress";
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      global.fetch = mockFetchRouting(apiAddress);

      await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      const signedHex = signMessageFn.mock.calls[0][0] as string;
      const signedUtf8 = Buffer.from(signedHex.slice(2), "hex").toString(
        "utf8",
      );
      expect(signedUtf8).toBe(apiAddress);
    });
  });
});
