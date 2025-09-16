import { RateLimitService } from "@/lib/rate-limit";

describe("RateLimitService", () => {
  const testIP = "192.168.1.100";

  beforeEach(async () => {
    // Reset rate limits before each test
    await RateLimitService.resetRateLimit(testIP);
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", async () => {
      const result = await RateLimitService.checkRateLimit(testIP);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should block requests when limit exceeded", async () => {
      // Make many requests to exceed the limit
      const promises = Array(150)
        .fill(0)
        .map(() => RateLimitService.checkRateLimit(testIP));

      const results = await Promise.all(promises);
      const blockedResults = results.filter((r) => !r.allowed);

      expect(blockedResults.length).toBeGreaterThan(0);
    });

    it("should return correct remaining count", async () => {
      const result1 = await RateLimitService.checkRateLimit(testIP);
      const result2 = await RateLimitService.checkRateLimit(testIP);

      expect(result1.remaining).toBeGreaterThan(result2.remaining);
    });
  });

  describe("checkStrictRateLimit", () => {
    it("should allow requests within strict limit", async () => {
      const result = await RateLimitService.checkStrictRateLimit(testIP);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should block requests when strict limit exceeded", async () => {
      // Make many requests to exceed the strict limit (10 requests)
      const promises = Array(15)
        .fill(0)
        .map(() => RateLimitService.checkStrictRateLimit(testIP));

      const results = await Promise.all(promises);
      const blockedResults = results.filter((r) => !r.allowed);

      expect(blockedResults.length).toBeGreaterThan(0);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return status for both limiters", async () => {
      const status = await RateLimitService.getRateLimitStatus(testIP);

      expect(status.general).toHaveProperty("remaining");
      expect(status.general).toHaveProperty("resetTime");
      expect(status.strict).toHaveProperty("remaining");
      expect(status.strict).toHaveProperty("resetTime");
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limits for an IP", async () => {
      // Exhaust the limit
      await RateLimitService.checkStrictRateLimit(testIP);
      await RateLimitService.checkStrictRateLimit(testIP);

      // Reset
      await RateLimitService.resetRateLimit(testIP);

      // Should be able to make requests again
      const result = await RateLimitService.checkStrictRateLimit(testIP);
      expect(result.allowed).toBe(true);
    });
  });
});
