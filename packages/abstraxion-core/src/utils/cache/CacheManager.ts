export interface TimeProvider {
  now(): number;
}

export class DefaultTimeProvider implements TimeProvider {
  now(): number {
    return Date.now();
  }
}

export interface CacheEntry<T> {
  data: Promise<T>;
  timestamp: number;
}

export interface CacheOptions {
  ttl: number;
  timeProvider?: TimeProvider;
  debugLabel?: string;
}

export class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private pendingRequests = new Map<string, Promise<T>>();
  private readonly ttl: number;
  private readonly timeProvider: TimeProvider;
  private readonly debugLabel?: string;

  constructor(options: CacheOptions) {
    this.ttl = options.ttl;
    this.timeProvider = options.timeProvider || new DefaultTimeProvider();
    this.debugLabel = options.debugLabel;
  }

  /**
   * Get a value from cache or fetch it using the provided function
   */
  async get(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Check if we have a valid cached entry
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      if (this.debugLabel) {
        console.debug(`Using cached ${this.debugLabel} for ${key}`);
      }
      return cached.data;
    }

    // Clean up expired entries
    this.cleanupExpired();

    // Create new fetch promise
    const fetchPromise = fetchFn()
      .then((result) => {
        // Cache the successful result
        this.cache.set(key, {
          data: Promise.resolve(result),
          timestamp: this.timeProvider.now(),
        });
        return result;
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(key);
      });

    // Store as pending request
    this.pendingRequests.set(key, fetchPromise);

    return fetchPromise;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear a specific cache entry
   */
  delete(key: string): boolean {
    this.pendingRequests.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Check if a cache entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Get the number of cached entries (excluding expired ones)
   */
  get size(): number {
    this.cleanupExpired();
    return this.cache.size;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return this.timeProvider.now() - entry.timestamp > this.ttl;
  }

  /**
   * Remove expired entries from the cache
   */
  private cleanupExpired(): void {
    const now = this.timeProvider.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
