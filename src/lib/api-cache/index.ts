/**
 * API Cache Module
 * Exports caching utilities for reducing redundant API calls
 */

export { APICache, generateCacheKey, getGlobalCache, resetGlobalCache } from './api-cache';
export { TaskCleanupService, getTaskCleanupService } from './task-cleanup';
export type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  ResourceConfig,
  PendingRequest,
  TTLConfig,
} from './types';
export { DEFAULT_CACHE_CONFIG, DEFAULT_TTL_CONFIG } from './types';
