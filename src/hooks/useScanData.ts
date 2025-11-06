import { useState, useEffect, useCallback, useRef } from 'react';
import { DbScan } from '@/app/db';
import { buildQueryParams, getJSON } from './utils/apiHelpers';

/**
 * Pagination configuration
 */
export interface ScanPaginationConfig {
  limit?: number;
  offset?: number;
}

/**
 * Filter configuration
 */
export interface ScanFilterConfig {
  projectId?: string;
  scanType?: string;
}

/**
 * Hook state and actions
 */
export interface UseScanDataResult {
  scans: DbScan[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: ScanFilterConfig) => void;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: DbScan[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  timestamp: number;
}

/**
 * Simple in-memory cache with TTL
 */
class ScanDataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(projectId: string, scanType?: string, offset?: number, limit?: number): string {
    return `${projectId}:${scanType || 'all'}:${offset || 0}:${limit || 'all'}`;
  }

  get(projectId: string, scanType?: string, offset?: number, limit?: number): CacheEntry | null {
    const key = this.getCacheKey(projectId, scanType, offset, limit);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(
    projectId: string,
    data: DbScan[],
    pagination: CacheEntry['pagination'],
    scanType?: string,
    offset?: number,
    limit?: number
  ): void {
    const key = this.getCacheKey(projectId, scanType, offset, limit);
    this.cache.set(key, {
      data,
      pagination,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(projectId?: string): void {
    if (!projectId) {
      this.clear();
      return;
    }

    // Remove all entries for this project
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${projectId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Global cache instance
const globalCache = new ScanDataCache();

/**
 * Fetch scan data from the API
 */
async function fetchScansFromAPI(
  projectId: string,
  scanType: string | undefined,
  offset: number,
  limit: number
): Promise<{ scans: DbScan[]; pagination: CacheEntry['pagination'] }> {
  return getJSON<{ scans: DbScan[]; pagination: CacheEntry['pagination'] }>(
    '/api/scans',
    {
      projectId,
      scanType,
      offset,
      limit
    }
  );
}

/**
 * Hook for fetching scan data with pagination, caching, and error handling
 *
 * @param filters - Filter configuration (projectId is required)
 * @param paginationConfig - Pagination configuration
 *
 * @example
 * ```tsx
 * const { scans, loading, error, pagination, refresh, loadMore } = useScanData(
 *   { projectId: 'project-123', scanType: 'zen_architect' },
 *   { limit: 20 }
 * );
 * ```
 */
export function useScanData(
  filters: ScanFilterConfig,
  paginationConfig: ScanPaginationConfig = {}
): UseScanDataResult {
  const { projectId, scanType } = filters;
  const { limit = 20, offset = 0 } = paginationConfig;

  const [scans, setScans] = useState<DbScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit,
    hasMore: false
  });

  // Track current filters to detect changes
  const currentFiltersRef = useRef({ projectId, scanType });
  const currentOffsetRef = useRef(offset);

  /**
   * Fetch scan data from API
   */
  const fetchScans = useCallback(async (
    fetchProjectId: string,
    fetchScanType?: string,
    fetchOffset: number = 0,
    fetchLimit: number = 20,
    useCache: boolean = true
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (useCache) {
        const cached = globalCache.get(fetchProjectId, fetchScanType, fetchOffset, fetchLimit);
        if (cached) {
          setScans(cached.data);
          setPagination(cached.pagination);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const data = await fetchScansFromAPI(fetchProjectId, fetchScanType, fetchOffset, fetchLimit);

      setScans(data.scans);
      setPagination(data.pagination);

      // Update cache
      globalCache.set(
        fetchProjectId,
        data.scans,
        data.pagination,
        fetchScanType,
        fetchOffset,
        fetchLimit
      );

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scans';
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  /**
   * Refresh current data (bypass cache)
   */
  const refresh = useCallback(async () => {
    if (!projectId) {
      setError('projectId is required');
      return;
    }

    globalCache.invalidate(projectId);
    await fetchScans(projectId, scanType, pagination.offset, pagination.limit, false);
  }, [projectId, scanType, pagination.offset, pagination.limit, fetchScans]);

  /**
   * Load more scans (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!projectId) {
      setError('projectId is required');
      return;
    }

    if (!pagination.hasMore) {
      return;
    }

    const newOffset = pagination.offset + pagination.limit;
    currentOffsetRef.current = newOffset;

    await fetchScans(projectId, scanType, newOffset, pagination.limit, true);
  }, [projectId, scanType, pagination, fetchScans]);

  /**
   * Update filters
   */
  const setFilters = useCallback((newFilters: ScanFilterConfig) => {
    currentFiltersRef.current = {
      projectId: newFilters.projectId,
      scanType: newFilters.scanType
    };
    currentOffsetRef.current = 0;
  }, []);

  /**
   * Initial load and filter change detection
   */
  useEffect(() => {
    if (!projectId) {
      setError('projectId is required');
      setLoading(false);
      return;
    }

    // Check if filters changed
    const filtersChanged =
      currentFiltersRef.current.projectId !== projectId ||
      currentFiltersRef.current.scanType !== scanType;

    if (filtersChanged) {
      currentFiltersRef.current = { projectId, scanType };
      currentOffsetRef.current = 0;
    }

    fetchScans(projectId, scanType, currentOffsetRef.current, limit, true);
  }, [projectId, scanType, limit, fetchScans]);

  return {
    scans,
    loading,
    error,
    pagination,
    refresh,
    loadMore,
    setFilters
  };
}

/**
 * Clear the entire cache
 */
export function clearScanDataCache(): void {
  globalCache.clear();
}

/**
 * Invalidate cache for a specific project
 */
export function invalidateScanDataCache(projectId?: string): void {
  globalCache.invalidate(projectId);
}
