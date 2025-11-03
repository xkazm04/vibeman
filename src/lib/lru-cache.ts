/**
 * Simple LRU (Least Recently Used) cache implementation
 * Used to cache database query results to reduce SQLite access
 */

export interface LRUCacheOptions {
  maxSize?: number; // Maximum number of entries to cache
  ttl?: number; // Time to live in milliseconds (optional)
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl?: number;

  constructor(options: LRUCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 200; // Default to 200 entries
    this.ttl = options.ttl;
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry is expired
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   * Evicts oldest entry if cache is full
   */
  set(key: string, value: T): void {
    // If key exists, delete it first to re-insert at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
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
  }

  /**
   * Clear all entries matching a pattern
   * Useful for invalidating related queries (e.g., all idea queries)
   */
  clearPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

/**
 * Generate a cache key from function name and arguments
 */
export function generateCacheKey(prefix: string, ...args: Array<string | number | boolean | null | undefined>): string {
  return `${prefix}:${JSON.stringify(args)}`;
}
