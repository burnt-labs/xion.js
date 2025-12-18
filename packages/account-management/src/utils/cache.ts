/**
 * Generic cache manager with TTL support
 * Provides in-memory caching for any data type with automatic expiration
 *
 * Moved from dashboard utilities - production-tested implementation
 */

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

/**
 * Generic cache manager with time-to-live (TTL) support
 * Uses in-memory Map storage with automatic cleanup of expired entries
 *
 * @example
 * ```typescript
 * const cache = new CacheManager<TreasuryConfig>(10); // 10 minute TTL
 *
 * const result = await cache.get('treasury-key', async () => {
 *   return await fetchTreasuryConfig();
 * });
 *
 * console.log(result.fromCache); // true if cached, false if fresh
 * ```
 */
export class CacheManager<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private readonly ttlMs: number;

  /**
   * Create a new cache manager
   * @param ttlMinutes Time-to-live in minutes (default: 10)
   */
  constructor(ttlMinutes: number = 10) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Get cached data or fetch new data using the provided fetcher function
   * @param key Cache key
   * @param fetcher Function to fetch data if not cached or expired
   * @returns Cached or newly fetched data with cache hit indicator
   */
  async get(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (cached && cached.expiresAt > now) {
      return { data: cached.data, fromCache: true };
    }

    // Fetch new data
    const data = await fetcher();

    // Cache the successful result
    this.cache.set(key, {
      data,
      expiresAt: now + this.ttlMs,
    });

    // Clean up expired entries periodically
    this.cleanupExpired();

    return { data, fromCache: false };
  }

  /**
   * Clear specific cache entry
   * @param key Cache key to clear
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in cache (even if expired)
   * @param key Cache key
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove expired entries to prevent memory leaks
   * Called automatically after each get() operation
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Default cache instance for treasury data (10 minute TTL)
 * Use this for treasury configuration caching across the application
 */
export const treasuryCacheManager = new CacheManager(10);
