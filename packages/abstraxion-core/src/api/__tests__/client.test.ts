/**
 * Tests for API client utilities
 *
 * NOTE: The actual API endpoints are tested in @account-abstraction-api/tests/
 * These tests focus on client-side logic: error parsing, type guards, and response handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAccountAddress,
  checkAccountOnChain,
  createEthWalletAccountV2,
  createSecp256k1AccountV2,
  createJWTAccountV2,
} from "../client";
import type { ErrorResponse } from "@burnt-labs/signers";

describe("API Client - Error Parsing", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Error Response Handling", () => {
    it("should parse standard ErrorResponse format", async () => {
      const errorResponse: ErrorResponse = {
        error: {
          message: "Invalid authenticator type",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify(errorResponse),
      });

      await expect(
        getAccountAddress("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("Invalid authenticator type");
    });

    it("should parse legacy error format (message at root level)", async () => {
      const legacyError = {
        message: "Account not found",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify(legacyError),
      });

      await expect(
        getAccountAddress("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("Account not found");
    });

    it("should use default error message for non-JSON responses", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(
        getAccountAddress("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("AA API v2 /address/ethwallet failed with status 500");
    });

    it("should use default error message for malformed JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "{ invalid json",
      });

      await expect(
        getAccountAddress("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("AA API v2 /address/ethwallet failed with status 400");
    });

    it("should handle error responses with unexpected structure", async () => {
      const unexpectedError = {
        statusCode: 500,
        details: "Something went wrong",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify(unexpectedError),
      });

      await expect(
        getAccountAddress("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("AA API v2 /address/ethwallet failed with status 500");
    });
  });

  describe("URL Encoding", () => {
    it("should properly encode special characters in identifier", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      await getAccountAddress("http://test-api", "JWT", "user@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api/api/v2/account/address/jwt/user%40example.com",
        expect.any(Object),
      );
    });

    it("should handle identifiers with spaces", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      await getAccountAddress(
        "http://test-api",
        "JWT",
        "user name with spaces",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api/api/v2/account/address/jwt/user%20name%20with%20spaces",
        expect.any(Object),
      );
    });

    it("should handle identifiers with special characters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      await getAccountAddress(
        "http://test-api",
        "JWT",
        "user+test@example.com?param=value",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api/api/v2/account/address/jwt/user%2Btest%40example.com%3Fparam%3Dvalue",
        expect.any(Object),
      );
    });
  });

  describe("checkAccountOnChain - 404 Handling", () => {
    it("should throw ACCOUNT_NOT_FOUND for 404 responses", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { message: "Not found" } }),
      });

      await expect(
        checkAccountOnChain("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("ACCOUNT_NOT_FOUND");
    });

    it("should parse regular errors for non-404 status codes", async () => {
      const errorResponse: ErrorResponse = {
        error: {
          message: "Rate limit exceeded",
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify(errorResponse),
      });

      await expect(
        checkAccountOnChain("http://test-api", "EthWallet", "test-id"),
      ).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("Request Headers", () => {
    it("should send proper Content-Type header for GET requests", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      await getAccountAddress("http://test-api", "EthWallet", "0x123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should send proper Content-Type header for POST requests", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ txHash: "hash123" }),
      });
      global.fetch = mockFetch;

      await createEthWalletAccountV2("http://test-api", {
        address: "0x123",
        signature: "sig123",
        chainId: "xion-testnet-1",
        salt: "salt123",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }),
      );
    });
  });

  describe("AuthenticatorType Case Handling", () => {
    it("should convert authenticator type to lowercase in URLs", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      await getAccountAddress("http://test-api", "EthWallet", "0x123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api/api/v2/account/address/ethwallet/0x123",
        expect.any(Object),
      );
    });

    it("should handle different authenticator types correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: "xion123" }),
      });
      global.fetch = mockFetch;

      // Test EthWallet
      await getAccountAddress("http://test-api", "EthWallet", "0x123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/ethwallet/"),
        expect.any(Object),
      );

      // Test Secp256k1
      await getAccountAddress("http://test-api", "Secp256k1", "pubkey123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/secp256k1/"),
        expect.any(Object),
      );

      // Test JWT
      await getAccountAddress("http://test-api", "JWT", "user@example.com");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/jwt/"),
        expect.any(Object),
      );
    });
  });

  describe("POST Request Body Serialization", () => {
    it("should properly serialize EthWallet request body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ txHash: "hash123" }),
      });
      global.fetch = mockFetch;

      const request = {
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        signature: "0xabcdef",
        chainId: "xion-testnet-1",
        salt: "salt123",
      };

      await createEthWalletAccountV2("http://test-api", request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(request),
        }),
      );
    });

    it("should properly serialize Secp256k1 request body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ txHash: "hash123" }),
      });
      global.fetch = mockFetch;

      const request = {
        publicKey: "pubkey123",
        signature: "sig123",
        chainId: "xion-testnet-1",
        salt: "salt123",
      };

      await createSecp256k1AccountV2("http://test-api", request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(request),
        }),
      );
    });

    it("should properly serialize JWT request body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ txHash: "hash123" }),
      });
      global.fetch = mockFetch;

      const request = {
        token: "jwt.token.here",
        salt: "salt123",
        chainId: "xion-testnet-1",
      };

      await createJWTAccountV2("http://test-api", request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(request),
        }),
      );
    });
  });
});
