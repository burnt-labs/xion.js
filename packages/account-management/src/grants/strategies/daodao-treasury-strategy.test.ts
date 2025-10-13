import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DaoDaoTreasuryStrategy } from "./daodao-treasury-strategy";
import type { AAClient } from "../signers";
import { treasuryCacheManager } from "../utils/cache";

// Mock the cache manager
vi.mock("../utils/cache", () => ({
  treasuryCacheManager: {
    get: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("DaoDaoTreasuryStrategy", () => {
  let strategy: DaoDaoTreasuryStrategy;
  let mockClient: AAClient;

  beforeEach(() => {
    strategy = new DaoDaoTreasuryStrategy();
    mockClient = {
      getChainId: vi.fn().mockResolvedValue("xion-mainnet-1"),
    } as unknown as AAClient;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch treasury config from indexer successfully", async () => {
    const mockResponse = {
      grantConfigs: {
        "/cosmos.authz.v1beta1.MsgGrant": {
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: "base64encodedvalue",
          },
          description: "Test grant",
        },
      },
      params: {
        display_url: "https://example.com/",
        redirect_url: "https://example.com/redirect",
        icon_url: "https://example.com/icon.png",
      },
    };

    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock successful fetch
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.grantConfigs).toHaveLength(1);
    expect(result?.grantConfigs[0].description).toBe("Test grant");
    expect(result?.params.display_url).toBe("https://example.com/");
    expect(result?.params.redirect_url).toBe("https://example.com/redirect");
    expect(result?.params.icon_url).toBe("https://example.com/icon.png");
  });

  it("should return cached data on subsequent calls", async () => {
    const mockResponse = {
      grantConfigs: {
        "/cosmos.authz.v1beta1.MsgGrant": {
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: "base64encodedvalue",
          },
          description: "Cached grant",
        },
      },
      params: {
        display_url: "https://cached.com",
        redirect_url: "https://cached.com/redirect",
        icon_url: "https://cached.com/icon.png",
      },
    };

    // Mock cache hit
    vi.mocked(treasuryCacheManager.get).mockResolvedValueOnce({
      data: mockResponse,
      fromCache: true,
    });

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.grantConfigs[0].description).toBe("Cached grant");
    expect(global.fetch).not.toHaveBeenCalled(); // Should not fetch when cache hit
  });

  it("should handle indexer error responses", async () => {
    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock error response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should handle network errors", async () => {
    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock network error
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should handle timeout errors", async () => {
    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock abort error (timeout)
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.mocked(global.fetch).mockRejectedValueOnce(abortError);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should validate response structure", async () => {
    const invalidResponse = {
      // Missing grantConfigs
      params: {
        display_url: "https://example.com",
      },
    };

    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock invalid response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse,
    } as Response);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).toBeNull();
  });

  it("should handle unsafe URLs in params", async () => {
    const mockResponse = {
      grantConfigs: {},
      params: {
        display_url: "javascript:alert('xss')",
        redirect_url: "https://safe.com/",
        icon_url: "data:text/html,<script>alert('xss')</script>",
      },
    };

    // Mock cache miss
    vi.mocked(treasuryCacheManager.get).mockImplementation(
      async (key, fetcher) => {
        const data = await fetcher();
        return { data, fromCache: false };
      },
    );

    // Mock response with unsafe URLs
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await strategy.fetchTreasuryConfig(
      "xion1abc123",
      mockClient,
    );

    expect(result).not.toBeNull();
    expect(result?.params.display_url).toBe(""); // Unsafe URL should be empty
    expect(result?.params.redirect_url).toBe("https://safe.com/"); // Safe URL preserved
    expect(result?.params.icon_url).toBe(""); // Unsafe URL should be empty
  });
});
