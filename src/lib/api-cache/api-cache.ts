/**
 * API Cache
 * A caching layer with TTL support, request deduplication, and statistics tracking
 * for reducing redundant API calls
 */

import { createLogger } from '@/lib/utils/logger';
import type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  PendingRequest,
  TTLConfig,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_TTL_CONFIG,
} from './types';

const logger = createLogger('APICache');

export class APICache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private pendingRequests: Map<string, PendingRequest<T>>;
  private config: CacheConfig;
  private ttlConfig: TTLConfig;
  private stats: {
    hits: number;
    misses: number;
    deduplicatedRequests: number;
    totalRequests: number;
  };

  constructor(
    config: Partial<CacheConfig> = {},
    ttlConfig: Partial<TTLConfig> = {}
  ) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.config = {
      maxSize: 500,
      defaultTtl: 60 * 1000,
      enableDeduplication: true,
      enableStats: true,
      ...config,
    };
    this.ttlConfig = {
      githubProject: 10 * 60 * 1000,
      githubProjectItems: 5 * 60 * 1000,
      githubFieldValues: 2 * 60 * 1000,
      taskData: 30 * 1000,
      sessionData: 5 * 60 * 1000,
      default: 60 * 1000,
      ...ttlConfig,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      deduplicatedRequests: 0,
      totalRequests: 0,
    };
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // Move to end (most recently used) and increment hits
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache with optional custom TTL
   */
  set(key: string, value: T, ttl?: number): void {
    // If key exists, delete it first to re-insert at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if cache is full
    while (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value as string;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl,
      hits: 0,
    });
  }

  /**
   * Execute a function with caching and deduplication
   * If the same request is already in-flight, returns the existing promise
   */
  async getOrFetch<R extends T>(
    key: string,
    fetcher: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    if (this.config.enableStats) {
      this.stats.totalRequests++;
    }

    // Check cache first
    const cached = this.get(key) as R | undefined;
    if (cached !== undefined) {
      return cached;
    }

    // Check for pending request (deduplication)
    if (this.config.enableDeduplication) {
      const pending = this.pendingRequests.get(key);
      if (pending) {
        if (this.config.enableStats) {
          this.stats.deduplicatedRequests++;
        }
        logger.debug(`Deduplicating request for key: ${key}`);
        return pending.promise as Promise<R>;
      }
    }

    // Create new request
    const promise = fetcher()
      .then((result) => {
        this.set(key, result as T, ttl);
        return result;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    // Store pending request for deduplication
    if (this.config.enableDeduplication) {
      this.pendingRequests.set(key, {
        promise: promise as Promise<T>,
        timestamp: Date.now(),
      });
    }

    return promise;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear all entries matching a pattern
   * Useful for invalidating related entries (e.g., all GitHub project entries)
   */
  invalidatePattern(pattern: RegExp): number {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Invalidate all entries with a specific prefix
   */
  invalidatePrefix(prefix: string): number {
    return this.invalidatePattern(new RegExp(`^${prefix}`));
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get TTL configuration for a resource type
   */
  getTTL(resourceType: keyof TTLConfig): number {
    return this.ttlConfig[resourceType] || this.ttlConfig.default;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      deduplicatedRequests: this.stats.deduplicatedRequests,
      totalRequests: this.stats.totalRequests,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      deduplicatedRequests: 0,
      totalRequests: 0,
    };
  }

  /**
   * Clean up expired entries (useful for periodic maintenance)
   */
  cleanupExpired(): number {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Get all pending requests (for debugging)
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Generate a cache key from a prefix and arguments
 */
export function generateCacheKey(
  prefix: string,
  ...args: Array<string | number | boolean | null | undefined>
): string {
  const normalizedArgs = args.map((arg) =>
    arg === null || arg === undefined ? '' : String(arg)
  );
  return `${prefix}:${normalizedArgs.join(':')}`;
}

// Singleton instance for global API caching
let globalCache: APICache | null = null;

/**
 * Get the global API cache instance
 */
export function getGlobalCache(): APICache {
  if (!globalCache) {
    globalCache = new APICache();
  }
  return globalCache;
}

/**
 * Reset the global cache (useful for testing)
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.clear();
    globalCache.resetStats();
  }
  globalCache = null;
}
