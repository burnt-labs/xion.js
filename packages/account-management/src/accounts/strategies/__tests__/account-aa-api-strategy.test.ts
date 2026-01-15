/**
 * Unit tests for AAApiAccountStrategy
 * Validates integration with account-abstraction-api and prevents type regressions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AAApiAccountStrategy } from "../account-aa-api-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

describe("AAApiAccountStrategy", () => {
  let strategy: AAApiAccountStrategy;
  const baseURL = "https://aa-api.xion-testnet-2.burnt.com";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("V1 API", () => {
    beforeEach(() => {
      strategy = new AAApiAccountStrategy({ baseURL, version: "v1" });
    });

    it("should fetch accounts with correct API contract", async () => {
      const mockResponse = {
        id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8",
        codeId: 1,
        authenticators: [
          {
            id: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8-0",
            type: "Jwt",
            authenticator: "test-project.user-123",
            authenticatorIndex: 0,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      // Validate API call structure
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/test-project/user-123`,
      );

      // Validate response type contract (matches account-abstraction-api/src/api/v1/accounts/authenticator.ts:20-22)
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        codeId: expect.any(Number),
        authenticators: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            authenticator: expect.any(String),
            authenticatorIndex: expect.any(Number),
          }),
        ]),
      });
    });

    it("should handle 404 as empty array", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const result = await strategy.fetchSmartAccounts(
        "test-project.nonexistent",
      );

      expect(result).toEqual([]);
    });

    it("should throw on non-404 errors", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      } as Response);

      await expect(
        strategy.fetchSmartAccounts("test-project.user-123"),
      ).rejects.toThrow("AA-API returned 502: Bad Gateway");
    });

    it("should validate authenticator format", async () => {
      await expect(
        strategy.fetchSmartAccounts("invalid-format"),
      ).rejects.toThrow(
        'Invalid authenticator format for AA-API v1: expected "aud.sub"',
      );
    });

    it("should handle authenticators with dots in sub", async () => {
      const mockResponse = {
        id: "xion1test",
        codeId: 1,
        authenticators: [],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await strategy.fetchSmartAccounts("project.user.with.dots");

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/project/user.with.dots`,
      );
    });

    it("should handle array responses", async () => {
      const mockResponse = [
        {
          id: "xion1test1",
          codeId: 1,
          authenticators: [],
        },
        {
          id: "xion1test2",
          codeId: 1,
          authenticators: [],
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      expect(result).toHaveLength(2);
    });

    it("should filter out invalid response objects", async () => {
      const mockResponse = [
        {
          id: "xion1valid",
          codeId: 1,
          authenticators: [],
        },
        {
          id: "xion1missing-code-id",
          // Missing codeId
          authenticators: [],
        },
        {
          id: 123, // Invalid type
          codeId: 1,
          authenticators: [],
        },
        null,
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await strategy.fetchSmartAccounts("test-project.user-123");

      // Only the first valid object should remain
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("xion1valid");
    });

    it("should handle network errors", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError("Failed to fetch"),
      );

      await expect(
        strategy.fetchSmartAccounts("test-project.user-123"),
      ).rejects.toThrow("Network error while fetching from AA-API");
    });

    it("should URL-encode authenticator parts", async () => {
      const mockResponse = {
        id: "xion1test",
        codeId: 1,
        authenticators: [],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await strategy.fetchSmartAccounts("test@project.user/123");

      // Verify URL encoding
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseURL}/api/v1/jwt-accounts/test%40project/user%2F123`,
      );
    });
  });

  describe("V2 API (future)", () => {
    it("should throw for V2 until implemented", async () => {
      strategy = new AAApiAccountStrategy({ baseURL, version: "v2" });

      await expect(
        strategy.fetchSmartAccounts("test-authenticator"),
      ).rejects.toThrow("AA-API v2 not yet implemented");
    });
  });

  describe("Configuration", () => {
    it("should default to v1 when version not specified", () => {
      strategy = new AAApiAccountStrategy({ baseURL });
      expect(strategy["config"].version).toBe("v1");
    });
  });
});
