/**
 * Unit tests for NumiaAccountStrategy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NumiaAccountStrategy } from "../account-numia-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import { mockIndexerResponses } from "@burnt-labs/signers/testing";

// Mock fetch globally
global.fetch = vi.fn();

describe("NumiaAccountStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should add trailing slash if missing", () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");
      expect((strategy as any).baseURL).toMatch(/\/$/);
    });

    it("should add v2 suffix if missing", () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com/");
      expect((strategy as any).baseURL).toContain("/v2/");
    });

    it("should preserve v2 suffix if present", () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com/v2/",
      );
      expect((strategy as any).baseURL).toBe("https://indexer.example.com/v2/");
    });

    it("should preserve v3 suffix if present", () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com/v3/",
      );
      expect((strategy as any).baseURL).toBe("https://indexer.example.com/v3/");
    });

    it("should store auth token when provided", () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com",
        "test-token",
      );
      expect((strategy as any).authToken).toBe("test-token");
    });
  });

  describe("fetchSmartAccounts", () => {
    it("should return accounts when found", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            smart_account: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
            code_id: 1,
            authenticators: [
              {
                authenticator: "test-auth",
                authenticator_index: 0,
                type: "Secp256K1",
              },
            ],
          },
        ],
      });

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8");
      expect(result[0].codeId).toBe(1);
      expect(result[0].authenticators).toHaveLength(1);
    });

    it("should return empty array for 404 response", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should throw error for non-404 HTTP errors", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      await expect(
        strategy.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1),
      ).rejects.toThrow("Numia indexer request failed: 503");
    });

    it("should throw error for network failures", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockRejectedValueOnce(
        new Error("Network request failed"),
      );

      await expect(
        strategy.fetchSmartAccounts("test-auth", AUTHENTICATOR_TYPE.Secp256K1),
      ).rejects.toThrow("Numia account strategy failed");
    });

    it("should encode authenticator in URL", async () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com/v2/",
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await strategy.fetchSmartAccounts(
        "test@auth#special",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("test@auth#special")),
        expect.anything(),
      );
    });

    it("should include Authorization header when auth token provided", async () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com",
        "test-token",
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should not include Authorization header when no auth token", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty("Authorization");
    });

    it("should parse response correctly", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            smart_account: "xion1test",
            code_id: "5", // String code_id
            authenticators: [
              {
                authenticator: "auth-1",
                authenticator_index: "0", // String index
                type: "EthWallet",
              },
              {
                authenticator: "auth-2",
                authenticator_index: "1",
                type: "Secp256K1",
              },
            ],
          },
        ],
      });

      const result = await strategy.fetchSmartAccounts(
        "auth-1",
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(result[0].codeId).toBe(5); // Converted to number
      expect(result[0].authenticators[0].authenticatorIndex).toBe(0); // Converted to number
      expect(result[0].authenticators[1].authenticatorIndex).toBe(1);
    });

    it("should set correct authenticator id format", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            smart_account: "xion1test",
            code_id: 1,
            authenticators: [
              {
                authenticator: "auth-value",
                authenticator_index: 2,
                type: "Secp256K1",
              },
            ],
          },
        ],
      });

      const result = await strategy.fetchSmartAccounts(
        "auth-value",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      // ID format should be: {smart_account}-{authenticator_index}
      expect(result[0].authenticators[0].id).toBe("xion1test-2");
    });

    it("should handle empty response array", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should handle null response", async () => {
      const strategy = new NumiaAccountStrategy("https://indexer.example.com");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should construct correct URL path", async () => {
      const strategy = new NumiaAccountStrategy(
        "https://indexer.example.com/v2/",
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await strategy.fetchSmartAccounts(
        "test-auth",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://indexer.example.com/v2/authenticators/test-auth/smartAccounts/details",
        expect.anything(),
      );
    });
  });
});
