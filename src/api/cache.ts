/**
 * Simple time-based cache for API responses
 * Prevents excessive API calls and enables offline-first behavior
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * In-memory cache with TTL support
 */
class ApiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get a cached value if it exists and hasn't expired
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): { data: T; cachedAt: Date } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      cachedAt: new Date(entry.timestamp),
    };
  }

  /**
   * Get cached data even if expired (for graceful degradation)
   * @param key Cache key
   * @returns Cached data or null if not found
   */
  getStale<T>(key: string): { data: T; cachedAt: Date; isStale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    return {
      data: entry.data,
      cachedAt: new Date(entry.timestamp),
      isStale: now > entry.expiresAt,
    };
  }

  /**
   * Store a value in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds Time-to-live in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  /**
   * Remove a specific entry from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for the application
export const apiCache = new ApiCache();

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  /** Trip planning results - 60 seconds */
  TRIPS: 60,
  /** Departure board data - 30 seconds */
  DEPARTURES: 30,
  /** Service deviations - 60 seconds minimum */
  DEVIATIONS: 60,
  /** Sites/stops list - 24 hours (rarely changes) */
  SITES: 86400,
  /** Stop finder results - 5 minutes */
  STOP_FINDER: 300,
} as const;

/**
 * Generate cache key for trip requests
 */
export function tripsCacheKey(originId: string, destinationId: string, numTrips: number): string {
  // Round to minute for cache efficiency
  const minuteTimestamp = Math.floor(Date.now() / 60000);
  return `trips:${originId}:${destinationId}:${numTrips}:${minuteTimestamp}`;
}

/**
 * Generate cache key for departure requests
 */
export function departuresCacheKey(siteId: string): string {
  // Round to 30 seconds for cache efficiency
  const halfMinuteTimestamp = Math.floor(Date.now() / 30000);
  return `departures:${siteId}:${halfMinuteTimestamp}`;
}

/**
 * Generate cache key for deviation requests
 */
export function deviationsCacheKey(siteIds: string[]): string {
  // Round to minute
  const minuteTimestamp = Math.floor(Date.now() / 60000);
  return `deviations:${siteIds.sort().join(",")}:${minuteTimestamp}`;
}

/**
 * Generate cache key for stop finder
 */
export function stopFinderCacheKey(query: string): string {
  return `stopfinder:${query.toLowerCase().trim()}`;
}

