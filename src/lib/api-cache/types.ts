/**
 * API Cache Types
 * Type definitions for the caching and deduplication system
 */

export interface CacheConfig {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Whether to enable request deduplication */
  enableDeduplication: boolean;
  /** Whether to enable cache statistics tracking */
  enableStats: boolean;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  deduplicatedRequests: number;
  totalRequests: number;
}

export interface ResourceConfig {
  /** TTL in milliseconds for this resource type */
  ttl: number;
  /** Cache key prefix for this resource type */
  prefix: string;
  /** Whether mutations should invalidate related cache entries */
  invalidateOnMutation: boolean;
}

export interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/** TTL configuration for different resource types */
export interface TTLConfig {
  /** GitHub project data - relatively stable, cache for longer */
  githubProject: number;
  /** GitHub project items - may change more frequently */
  githubProjectItems: number;
  /** GitHub field values - can change frequently */
  githubFieldValues: number;
  /** Task data - short-lived */
  taskData: number;
  /** Session data - medium duration */
  sessionData: number;
  /** Default for unspecified resources */
  default: number;
}

export const DEFAULT_TTL_CONFIG: TTLConfig = {
  githubProject: 10 * 60 * 1000,      // 10 minutes
  githubProjectItems: 5 * 60 * 1000,  // 5 minutes
  githubFieldValues: 2 * 60 * 1000,   // 2 minutes
  taskData: 30 * 1000,                // 30 seconds
  sessionData: 5 * 60 * 1000,         // 5 minutes
  default: 60 * 1000,                 // 1 minute
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 500,
  defaultTtl: DEFAULT_TTL_CONFIG.default,
  enableDeduplication: true,
  enableStats: true,
};
