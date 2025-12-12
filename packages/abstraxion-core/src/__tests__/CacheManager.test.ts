import { describe, it, expect, beforeEach, vi } from "vitest";
import { CacheManager } from "../utils/cache/CacheManager";
import { MockTimer } from "@burnt-labs/test-utils/helpers";

describe("CacheManager", () => {
  let timeProvider: MockTimer;
  let cacheManager: CacheManager<string>;

  beforeEach(() => {
    timeProvider = new MockTimer(1000000);
    cacheManager = new CacheManager<string>({
      ttl: 5 * 60 * 1000, // 5 minutes
      timeProvider,
    });
  });

  describe("Basic Functionality", () => {
    it("should cache values on first fetch", async () => {
      const fetchFn = vi.fn().mockResolvedValue("test-value");

      const result = await cacheManager.get("key1", fetchFn);

      expect(result).toBe("test-value");
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("should return cached value on subsequent calls", async () => {
      const fetchFn = vi.fn().mockResolvedValue("test-value");

      // First call
      await cacheManager.get("key1", fetchFn);
      // Second call
      const result = await cacheManager.get("key1", fetchFn);

      expect(result).toBe("test-value");
      expect(fetchFn).toHaveBeenCalledTimes(1); // Should not fetch again
    });

    it("should cache different keys separately", async () => {
      const fetchFn1 = vi.fn().mockResolvedValue("value1");
      const fetchFn2 = vi.fn().mockResolvedValue("value2");

      const result1 = await cacheManager.get("key1", fetchFn1);
      const result2 = await cacheManager.get("key2", fetchFn2);

      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe("TTL Expiration", () => {
    it("should refetch after TTL expires", async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce("value1")
        .mockResolvedValueOnce("value2");

      // First call
      const result1 = await cacheManager.get("key1", fetchFn);
      expect(result1).toBe("value1");

      // Advance time by 4 minutes (under TTL)
      timeProvider.advance(4 * 60 * 1000);
      const result2 = await cacheManager.get("key1", fetchFn);
      expect(result2).toBe("value1"); // Should still be cached

      // Advance time by another 2 minutes (total 6 minutes, over TTL)
      timeProvider.advance(2 * 60 * 1000);
      const result3 = await cacheManager.get("key1", fetchFn);
      expect(result3).toBe("value2"); // Should refetch

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("should clean up expired entries when fetching", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      // Create multiple entries
      await cacheManager.get("key1", fetchFn);
      await cacheManager.get("key2", fetchFn);
      await cacheManager.get("key3", fetchFn);

      expect(cacheManager.size).toBe(3);

      // Expire first two entries
      timeProvider.advance(6 * 60 * 1000);

      // Fetch a new entry - this should trigger cleanup
      await cacheManager.get("key4", fetchFn);

      // Size should be 1 (only key4)
      expect(cacheManager.size).toBe(1);
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle concurrent requests for the same key", async () => {
      let resolvePromise: (value: string) => void;
      const delayedPromise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      const fetchFn = vi.fn().mockReturnValue(delayedPromise);

      // Start multiple concurrent requests
      const promises = [
        cacheManager.get("key1", fetchFn),
        cacheManager.get("key1", fetchFn),
        cacheManager.get("key1", fetchFn),
      ];

      // Should only call fetch once
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolvePromise!("concurrent-value");

      // All promises should resolve to the same value
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toBe("concurrent-value");
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("should handle errors in concurrent requests", async () => {
      let rejectPromise: (error: Error) => void;
      const delayedPromise = new Promise<string>((_, reject) => {
        rejectPromise = reject;
      });

      const fetchFn = vi.fn().mockReturnValue(delayedPromise);

      // Start multiple concurrent requests
      const promises = [
        cacheManager.get("key1", fetchFn).catch((e) => e),
        cacheManager.get("key1", fetchFn).catch((e) => e),
        cacheManager.get("key1", fetchFn).catch((e) => e),
      ];

      // Reject the promise
      const error = new Error("Fetch failed");
      rejectPromise!(error);

      // All promises should reject with the same error
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toBe(error);
      });

      // Should be able to retry after error
      const retryFn = vi.fn().mockResolvedValue("retry-value");
      const retryResult = await cacheManager.get("key1", retryFn);
      expect(retryResult).toBe("retry-value");
      expect(retryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cache Management", () => {
    it("should clear all entries", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      await cacheManager.get("key1", fetchFn);
      await cacheManager.get("key2", fetchFn);
      await cacheManager.get("key3", fetchFn);

      expect(cacheManager.size).toBe(3);

      cacheManager.clear();

      expect(cacheManager.size).toBe(0);
      expect(cacheManager.has("key1")).toBe(false);
      expect(cacheManager.has("key2")).toBe(false);
      expect(cacheManager.has("key3")).toBe(false);
    });

    it("should delete specific entries", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      await cacheManager.get("key1", fetchFn);
      await cacheManager.get("key2", fetchFn);

      expect(cacheManager.has("key1")).toBe(true);
      expect(cacheManager.has("key2")).toBe(true);

      const deleted = cacheManager.delete("key1");

      expect(deleted).toBe(true);
      expect(cacheManager.has("key1")).toBe(false);
      expect(cacheManager.has("key2")).toBe(true);
    });

    it("should check if key exists and is valid", async () => {
      const fetchFn = vi.fn().mockResolvedValue("value");

      expect(cacheManager.has("key1")).toBe(false);

      await cacheManager.get("key1", fetchFn);
      expect(cacheManager.has("key1")).toBe(true);

      // Expire the entry
      timeProvider.advance(6 * 60 * 1000);
      expect(cacheManager.has("key1")).toBe(false);
    });
  });

  describe("Debug Logging", () => {
    it("should log cache hits when debugLabel is provided", async () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation();

      const debugCacheManager = new CacheManager<string>({
        ttl: 5 * 60 * 1000,
        timeProvider,
        debugLabel: "test cache",
      });

      const fetchFn = vi.fn().mockResolvedValue("value");

      // First call - no cache hit
      await debugCacheManager.get("key1", fetchFn);
      expect(consoleSpy).not.toHaveBeenCalled();

      // Second call - cache hit
      await debugCacheManager.get("key1", fetchFn);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Using cached test cache for key1",
      );

      consoleSpy.mockRestore();
    });
  });
});
