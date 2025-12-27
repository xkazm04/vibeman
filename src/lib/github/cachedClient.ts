/**
 * Cached GitHub Client
 * Wraps GitHub API calls with caching and request deduplication
 */

import { createLogger } from '@/lib/utils/logger';
import { APICache, generateCacheKey } from '@/lib/api-cache';
import type { TTLConfig } from '@/lib/api-cache';
import {
  getProject,
  findProjectByNumber,
  getProjectItem,
  graphqlRequest,
} from './client';
import type { GitHubProject, GitHubProjectItem } from './types';

const logger = createLogger('CachedGitHubClient');

// Custom TTL configuration for GitHub resources
const GITHUB_TTL_CONFIG: Partial<TTLConfig> = {
  githubProject: 10 * 60 * 1000,      // 10 minutes - project structure rarely changes
  githubProjectItems: 5 * 60 * 1000,  // 5 minutes - items may update
  githubFieldValues: 2 * 60 * 1000,   // 2 minutes - field values can change
};

// Singleton cache instance for GitHub API
const githubCache = new APICache<unknown>(
  { maxSize: 200, enableDeduplication: true, enableStats: true },
  GITHUB_TTL_CONFIG
);

// Cache key prefixes
const CACHE_PREFIX = {
  project: 'github:project',
  projectByNumber: 'github:project:byNumber',
  projectItem: 'github:projectItem',
  graphql: 'github:graphql',
};

/**
 * Get project details with caching
 */
export async function getCachedProject(
  projectId: string,
  token?: string
): Promise<GitHubProject | null> {
  const cacheKey = generateCacheKey(CACHE_PREFIX.project, projectId);
  const ttl = githubCache.getTTL('githubProject');

  return githubCache.getOrFetch(
    cacheKey,
    () => getProject(projectId, token),
    ttl
  );
}

/**
 * Find project by owner and number with caching
 */
export async function getCachedProjectByNumber(
  owner: string,
  projectNumber: number,
  token?: string
): Promise<GitHubProject | null> {
  const cacheKey = generateCacheKey(CACHE_PREFIX.projectByNumber, owner, projectNumber);
  const ttl = githubCache.getTTL('githubProject');

  return githubCache.getOrFetch(
    cacheKey,
    () => findProjectByNumber(owner, projectNumber, token),
    ttl
  );
}

/**
 * Get project item by ID with caching
 */
export async function getCachedProjectItem(
  itemId: string,
  token?: string
): Promise<GitHubProjectItem | null> {
  const cacheKey = generateCacheKey(CACHE_PREFIX.projectItem, itemId);
  const ttl = githubCache.getTTL('githubProjectItems');

  return githubCache.getOrFetch(
    cacheKey,
    () => getProjectItem(itemId, token),
    ttl
  );
}

/**
 * Execute a cached GraphQL query
 * Use this for custom queries that should be cached
 */
export async function cachedGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
  ttl?: number
): Promise<T> {
  // Create a cache key from the query and variables
  const queryHash = hashQuery(query);
  const variablesHash = JSON.stringify(variables);
  const cacheKey = generateCacheKey(CACHE_PREFIX.graphql, queryHash, variablesHash);

  return githubCache.getOrFetch(
    cacheKey,
    () => graphqlRequest<T>(query, variables, token),
    ttl ?? githubCache.getTTL('default')
  );
}

/**
 * Invalidate cache entries for a specific project
 */
export function invalidateProjectCache(projectId: string): void {
  const pattern = new RegExp(`^github:project:${projectId}`);
  const count = githubCache.invalidatePattern(pattern);
  logger.debug(`Invalidated ${count} cache entries for project ${projectId}`);
}

/**
 * Invalidate cache entries for a specific project item
 */
export function invalidateProjectItemCache(itemId: string): void {
  const cacheKey = generateCacheKey(CACHE_PREFIX.projectItem, itemId);
  githubCache.delete(cacheKey);
  logger.debug(`Invalidated cache entry for project item ${itemId}`);
}

/**
 * Invalidate all GitHub cache entries
 */
export function invalidateAllGitHubCache(): void {
  const count = githubCache.invalidatePrefix('github:');
  logger.debug(`Invalidated ${count} GitHub cache entries`);
}

/**
 * Get cache statistics
 */
export function getGitHubCacheStats() {
  return {
    ...githubCache.getStats(),
    pendingRequests: githubCache.getPendingRequestCount(),
  };
}

/**
 * Clean up expired cache entries
 */
export function cleanupGitHubCache(): number {
  return githubCache.cleanupExpired();
}

/**
 * Simple hash function for query strings
 */
function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Warm up the cache with commonly needed data
 * Call this during application initialization if needed
 */
export async function warmupGitHubCache(
  projectId?: string,
  owner?: string,
  projectNumber?: number,
  token?: string
): Promise<void> {
  try {
    const promises: Promise<unknown>[] = [];

    if (projectId) {
      promises.push(getCachedProject(projectId, token));
    }

    if (owner && projectNumber) {
      promises.push(getCachedProjectByNumber(owner, projectNumber, token));
    }

    await Promise.allSettled(promises);
    logger.info('GitHub cache warmup completed');
  } catch (error) {
    logger.warn('GitHub cache warmup failed', error);
  }
}

// Export the cache instance for advanced usage
export { githubCache };
