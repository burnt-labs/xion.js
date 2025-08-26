import { fetchConfig, clearConfigCache } from "../src/utils/configUtils";
import {
  fetchTreasuryDataFromIndexer,
  clearTreasuryCache,
} from "../src/utils/grant/query";
import * as constants from "@burnt-labs/constants";

// Mock the constants module
jest.mock("@burnt-labs/constants");

// Mock fetch globally
global.fetch = jest.fn();

describe("Config Caching", () => {
  const mockRpcUrl = "https://rpc.example.com";
  const mockConfig = {
    dashboardUrl: "https://dashboard.example.com",
    restUrl: "https://rest.example.com",
    networkId: "test-network",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearConfigCache();
    // Reset the mock implementation
    (constants.fetchConfig as jest.Mock).mockResolvedValue(mockConfig);
  });

  describe("fetchConfig", () => {
    it("should fetch and cache config on first call", async () => {
      const result = await fetchConfig(mockRpcUrl);

      expect(result).toEqual(mockConfig);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1);
      expect(constants.fetchConfig).toHaveBeenCalledWith(mockRpcUrl);
    });

    it("should return cached config on subsequent calls", async () => {
      // First call
      await fetchConfig(mockRpcUrl);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await fetchConfig(mockRpcUrl);
      expect(result).toEqual(mockConfig);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should cache configs separately for different RPC URLs", async () => {
      const anotherRpcUrl = "https://another-rpc.example.com";
      const anotherConfig = {
        dashboardUrl: "https://another-dashboard.example.com",
        restUrl: "https://another-rest.example.com",
        networkId: "another-network",
      };

      (constants.fetchConfig as jest.Mock).mockImplementation((url) => {
        if (url === mockRpcUrl) return Promise.resolve(mockConfig);
        return Promise.resolve(anotherConfig);
      });

      // Fetch for first URL
      const result1 = await fetchConfig(mockRpcUrl);
      expect(result1).toEqual(mockConfig);

      // Fetch for second URL
      const result2 = await fetchConfig(anotherRpcUrl);
      expect(result2).toEqual(anotherConfig);

      expect(constants.fetchConfig).toHaveBeenCalledTimes(2);
      expect(constants.fetchConfig).toHaveBeenCalledWith(mockRpcUrl);
      expect(constants.fetchConfig).toHaveBeenCalledWith(anotherRpcUrl);

      // Verify both are cached
      await fetchConfig(mockRpcUrl);
      await fetchConfig(anotherRpcUrl);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(2); // Still only 2 calls
    });

    it("should handle concurrent requests for the same URL", async () => {
      // Create a delayed mock to simulate network latency
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (constants.fetchConfig as jest.Mock).mockReturnValue(delayedPromise);

      // Start multiple concurrent requests
      const promises = [
        fetchConfig(mockRpcUrl),
        fetchConfig(mockRpcUrl),
        fetchConfig(mockRpcUrl),
      ];

      // Should only call the underlying function once
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolvePromise!(mockConfig);

      // All promises should resolve to the same value
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toEqual(mockConfig);
      });

      // Still only called once despite multiple concurrent requests
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1);
    });

    it("should clear cache when clearConfigCache is called", async () => {
      // First call - cached
      await fetchConfig(mockRpcUrl);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(1);

      // Clear cache
      clearConfigCache();

      // Next call should fetch again
      await fetchConfig(mockRpcUrl);
      expect(constants.fetchConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe("Config Cache TTL", () => {
    it("should refetch after cache expires", async () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      try {
        // First call
        await fetchConfig(mockRpcUrl);
        expect(constants.fetchConfig).toHaveBeenCalledTimes(1);

        // Advance time by 4 minutes (under 5 minute TTL)
        currentTime += 4 * 60 * 1000;
        await fetchConfig(mockRpcUrl);
        expect(constants.fetchConfig).toHaveBeenCalledTimes(1); // Still cached

        // Advance time by another 2 minutes (total 6 minutes, over 5 minute TTL)
        currentTime += 2 * 60 * 1000;
        await fetchConfig(mockRpcUrl);
        expect(constants.fetchConfig).toHaveBeenCalledTimes(2); // Cache expired, refetched
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});

describe("Treasury Data Caching", () => {
  const mockTreasuryAddress = "treasury123";
  const mockRpcUrl = "https://rpc.example.com";
  const mockIndexerUrl = "https://indexer.example.com";
  const mockNetworkId = "test-network";
  const mockTreasuryData = {
    "/cosmos.authz.v1beta1.MsgGrant": {
      authorization: {
        type_url: "/cosmos.authz.v1beta1.MsgGrant",
        value: new Uint8Array([1, 2, 3]),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearTreasuryCache();

    // Mock fetchConfig to return network ID
    (constants.fetchConfig as jest.Mock).mockResolvedValue({
      dashboardUrl: "https://dashboard.example.com",
      restUrl: "https://rest.example.com",
      networkId: mockNetworkId,
    });

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTreasuryData,
    });
  });

  describe("fetchTreasuryDataFromIndexer", () => {
    it("should fetch and cache treasury data on first call", async () => {
      const result = await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );

      expect(result).toEqual(mockTreasuryData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockIndexerUrl}/${mockNetworkId}/contract/${mockTreasuryAddress}/xion/treasury/grantConfigs`,
      );
    });

    it("should return cached data on subsequent calls", async () => {
      // First call
      await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(result).toEqual(mockTreasuryData);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should cache data separately for different treasury addresses", async () => {
      const anotherTreasuryAddress = "treasury456";
      const anotherTreasuryData = {
        "/cosmos.bank.v1beta1.MsgSend": {
          authorization: {
            type_url: "/cosmos.bank.v1beta1.MsgSend",
            value: new Uint8Array([4, 5, 6]),
          },
        },
      };

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes(mockTreasuryAddress)) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTreasuryData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => anotherTreasuryData,
        });
      });

      // Fetch for first treasury
      const result1 = await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(result1).toEqual(mockTreasuryData);

      // Fetch for second treasury
      const result2 = await fetchTreasuryDataFromIndexer(
        anotherTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(result2).toEqual(anotherTreasuryData);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should use default indexer URL when not provided", async () => {
      await fetchTreasuryDataFromIndexer(mockTreasuryAddress, mockRpcUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://daodaoindexer.burnt.com/${mockNetworkId}/contract/${mockTreasuryAddress}/xion/treasury/grantConfigs`,
      );
    });

    it("should handle indexer errors gracefully", async () => {
      // Mock fetch error
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Should throw the error (not cache it)
      await expect(
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
      ).rejects.toThrow("Network error");

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle non-OK responses gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      // Should throw IndexerResponseError
      await expect(
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
      ).rejects.toThrow("Failed to fetch treasury data: Not Found");

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should not cache errors and allow retry", async () => {
      // First call fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      // First attempt should fail
      await expect(
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
      ).rejects.toThrow("Network error");

      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTreasuryData,
      });

      // Second attempt should succeed (not cached error)
      const result = await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );

      expect(result).toEqual(mockTreasuryData);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Two separate calls
    });

    it("should handle concurrent requests for the same treasury", async () => {
      // Need to also mock fetchConfig for the delayed promise
      let resolveConfigPromise: (value: any) => void;
      let resolveFetchPromise: (value: any) => void;

      const configDelayedPromise = new Promise((resolve) => {
        resolveConfigPromise = resolve;
      });

      const fetchDelayedPromise = new Promise((resolve) => {
        resolveFetchPromise = resolve;
      });

      (constants.fetchConfig as jest.Mock).mockReturnValue(
        configDelayedPromise,
      );
      (global.fetch as jest.Mock).mockReturnValue(fetchDelayedPromise);

      // Start multiple concurrent requests
      const promises = [
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
        fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        ),
      ];

      // Resolve config promise first
      resolveConfigPromise!({
        dashboardUrl: "https://dashboard.example.com",
        restUrl: "https://rest.example.com",
        networkId: mockNetworkId,
      });

      // Wait a tick for the config to be processed
      await new Promise((resolve) => setImmediate(resolve));

      // Should only call fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Resolve the fetch promise
      resolveFetchPromise!({
        ok: true,
        json: async () => mockTreasuryData,
      });

      // All promises should resolve to the same value
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toEqual(mockTreasuryData);
      });

      // Still only called once despite multiple concurrent requests
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should clear cache when clearTreasuryCache is called", async () => {
      // First call - cached
      await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearTreasuryCache();

      // Next call should fetch again
      await fetchTreasuryDataFromIndexer(
        mockTreasuryAddress,
        mockRpcUrl,
        mockIndexerUrl,
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Treasury Cache TTL", () => {
    it("should refetch after cache expires", async () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      try {
        // First call
        await fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        );
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Advance time by 8 minutes (under 10 minute TTL)
        currentTime += 8 * 60 * 1000;
        await fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        );
        expect(global.fetch).toHaveBeenCalledTimes(1); // Still cached

        // Advance time by another 3 minutes (total 11 minutes, over 10 minute TTL)
        currentTime += 3 * 60 * 1000;
        await fetchTreasuryDataFromIndexer(
          mockTreasuryAddress,
          mockRpcUrl,
          mockIndexerUrl,
        );
        expect(global.fetch).toHaveBeenCalledTimes(2); // Cache expired, refetched
      } finally {
        Date.now = originalDateNow;
      }
    });

    it("should clean up expired entries when fetching", async () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      try {
        // Create multiple entries
        await fetchTreasuryDataFromIndexer("treasury1", mockRpcUrl);
        await fetchTreasuryDataFromIndexer("treasury2", mockRpcUrl);

        // Advance time to expire first entry
        currentTime += 11 * 60 * 1000;

        // Fetch a new entry - this should trigger cleanup
        await fetchTreasuryDataFromIndexer("treasury3", mockRpcUrl);

        // Verify expired entries are cleaned up
        // First two should refetch, third is new
        expect(global.fetch).toHaveBeenCalledTimes(3);

        // Now fetch the first one again - it should have been cleaned up
        await fetchTreasuryDataFromIndexer("treasury1", mockRpcUrl);
        expect(global.fetch).toHaveBeenCalledTimes(4);
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});
