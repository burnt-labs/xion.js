import { RateLimiterMemory } from "rate-limiter-flexible";

// Create rate limiter instances
const rateLimiter = new RateLimiterMemory({
  keyPrefix: "api_rate_limit",
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000") / 1000, // Per 15 minutes (in seconds)
  blockDuration: 60, // Block for 1 minute if limit exceeded
});

const strictRateLimiter = new RateLimiterMemory({
  keyPrefix: "api_strict_rate_limit",
  points: 10, // 10 requests
  duration: 60, // per minute
  blockDuration: 300, // Block for 5 minutes
});

export class RateLimitService {
  /**
   * Check rate limit for general API endpoints
   */
  static async checkRateLimit(ip: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime?: number;
  }> {
    try {
      const result = await rateLimiter.consume(ip);
      return {
        allowed: true,
        remaining: result.remainingPoints,
        resetTime: Math.round(Date.now() / 1000) + result.msBeforeNext / 1000,
      };
    } catch (rejRes) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.round(Date.now() / 1000) + rejRes.msBeforeNext / 1000,
      };
    }
  }

  /**
   * Check strict rate limit for sensitive endpoints (login, connect, etc.)
   */
  static async checkStrictRateLimit(ip: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime?: number;
  }> {
    try {
      const result = await strictRateLimiter.consume(ip);
      return {
        allowed: true,
        remaining: result.remainingPoints,
        resetTime: Math.round(Date.now() / 1000) + result.msBeforeNext / 1000,
      };
    } catch (rejRes) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.round(Date.now() / 1000) + rejRes.msBeforeNext / 1000,
      };
    }
  }

  /**
   * Reset rate limit for an IP (for testing purposes)
   */
  static async resetRateLimit(ip: string): Promise<void> {
    await Promise.all([rateLimiter.delete(ip), strictRateLimiter.delete(ip)]);
  }

  /**
   * Get rate limit status without consuming points
   */
  static async getRateLimitStatus(ip: string): Promise<{
    general: { remaining: number; resetTime: number };
    strict: { remaining: number; resetTime: number };
  }> {
    const [generalResult, strictResult] = await Promise.all([
      rateLimiter.get(ip),
      strictRateLimiter.get(ip),
    ]);

    return {
      general: {
        remaining:
          generalResult?.remainingPoints ||
          parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
        resetTime: generalResult
          ? Math.round(Date.now() / 1000) + generalResult.msBeforeNext / 1000
          : 0,
      },
      strict: {
        remaining: strictResult?.remainingPoints || 10,
        resetTime: strictResult
          ? Math.round(Date.now() / 1000) + strictResult.msBeforeNext / 1000
          : 0,
      },
    };
  }
}

// Backward compatibility exports
export const checkRateLimit = RateLimitService.checkRateLimit;
export const checkStrictRateLimit = RateLimitService.checkStrictRateLimit;
