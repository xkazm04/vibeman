/**
 * Analytics Aggregation Service
 *
 * Provides server-side aggregation with temporal partitioning for analytics data.
 * Pre-computes per-scan-type and overall analytics using weekly snapshots.
 * Caches results in memory for fast access, invalidated only on data changes.
 */

import { ideaDb } from '@/app/db';
import { DbIdea } from '@/app/db/models/types';
import { SCAN_TYPES } from '@/app/features/Ideas/sub_IdeasSetup/lib/ScanTypeConfig';

// Types for aggregated statistics
export interface AggregatedIdeaStats {
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  total: number;
  acceptanceRatio: number;
}

export interface AggregatedScanTypeStats extends AggregatedIdeaStats {
  scanType: string;
}

export interface WeeklySnapshot {
  weekStart: string; // ISO date string for week start (Monday)
  weekEnd: string;   // ISO date string for week end (Sunday)
  scanTypes: AggregatedScanTypeStats[];
  overall: AggregatedIdeaStats;
  projectBreakdown: Map<string, number>;
  contextBreakdown: Map<string, number>;
}

export interface AggregatedStats {
  scanTypes: AggregatedScanTypeStats[];
  overall: AggregatedIdeaStats;
  projects: Array<{ projectId: string; name: string; totalIdeas: number }>;
  contexts: Array<{ contextId: string; name: string; totalIdeas: number }>;
  weeklySnapshots: WeeklySnapshot[];
  lastUpdated: number;
  cacheKey: string;
}

export interface CacheKey {
  projectId: string | null;
  contextId: string | null;
  timeWindow: 'all' | 'week' | 'month' | 'quarter' | 'year';
}

// Cache entry with metadata
interface CacheEntry {
  data: AggregatedStats;
  createdAt: number;
  expiresAt: number;
  version: number;
}

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL
const MAX_CACHE_ENTRIES = 100;

/**
 * Analytics Aggregation Service singleton
 */
class AnalyticsAggregationService {
  private cache: Map<string, CacheEntry> = new Map();
  private globalVersion: number = 0;
  private initialized: boolean = false;

  /**
   * Generate a cache key from filter parameters
   */
  private generateCacheKey(key: CacheKey): string {
    return `${key.projectId || 'all'}:${key.contextId || 'all'}:${key.timeWindow}`;
  }

  /**
   * Parse cache key string back to CacheKey object
   */
  private parseCacheKey(keyString: string): CacheKey {
    const [projectId, contextId, timeWindow] = keyString.split(':');
    return {
      projectId: projectId === 'all' ? null : projectId,
      contextId: contextId === 'all' ? null : contextId,
      timeWindow: timeWindow as CacheKey['timeWindow']
    };
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get the end of the week (Sunday) for a given date
   */
  private getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * Get date range based on time window
   */
  private getDateRange(timeWindow: CacheKey['timeWindow']): { start: Date | null; end: Date } {
    const now = new Date();
    const end = now;
    let start: Date | null = null;

    switch (timeWindow) {
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
      default:
        start = null;
        break;
    }

    return { start, end };
  }

  /**
   * Filter ideas by project, context, and date range
   */
  private filterIdeas(
    ideas: DbIdea[],
    projectId: string | null,
    contextId: string | null,
    startDate: Date | null,
    endDate: Date
  ): DbIdea[] {
    return ideas.filter(idea => {
      // Project filter
      if (projectId && idea.project_id !== projectId) {
        return false;
      }

      // Context filter
      if (contextId && idea.context_id !== contextId) {
        return false;
      }

      // Date range filter
      if (startDate) {
        const ideaDate = new Date(idea.created_at);
        if (ideaDate < startDate || ideaDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate status counts for a set of ideas
   */
  private calculateStatusCounts(ideas: DbIdea[]): Omit<AggregatedIdeaStats, 'acceptanceRatio'> {
    return {
      pending: ideas.filter(i => i.status === 'pending').length,
      accepted: ideas.filter(i => i.status === 'accepted').length,
      rejected: ideas.filter(i => i.status === 'rejected').length,
      implemented: ideas.filter(i => i.status === 'implemented').length,
      total: ideas.length
    };
  }

  /**
   * Calculate acceptance ratio
   */
  private calculateAcceptanceRatio(accepted: number, implemented: number, total: number): number {
    return total > 0 ? Math.round(((accepted + implemented) / total) * 100) : 0;
  }

  /**
   * Calculate stats for each scan type
   */
  private calculateScanTypeStats(ideas: DbIdea[]): AggregatedScanTypeStats[] {
    const scanTypes = SCAN_TYPES.map(t => t.value);

    return scanTypes.map(scanType => {
      const scanIdeas = ideas.filter(idea => idea.scan_type === scanType);
      const counts = this.calculateStatusCounts(scanIdeas);

      return {
        scanType,
        ...counts,
        acceptanceRatio: this.calculateAcceptanceRatio(counts.accepted, counts.implemented, counts.total)
      };
    });
  }

  /**
   * Calculate overall stats
   */
  private calculateOverallStats(ideas: DbIdea[]): AggregatedIdeaStats {
    const counts = this.calculateStatusCounts(ideas);
    return {
      ...counts,
      acceptanceRatio: this.calculateAcceptanceRatio(counts.accepted, counts.implemented, counts.total)
    };
  }

  /**
   * Group ideas by a field and count
   */
  private groupByField<T extends string>(
    ideas: DbIdea[],
    fieldGetter: (idea: DbIdea) => T | null
  ): Map<T, number> {
    const map = new Map<T, number>();

    ideas.forEach(idea => {
      const fieldValue = fieldGetter(idea);
      if (fieldValue) {
        const count = map.get(fieldValue) || 0;
        map.set(fieldValue, count + 1);
      }
    });

    return map;
  }

  /**
   * Generate weekly snapshots for temporal partitioning
   */
  private generateWeeklySnapshots(ideas: DbIdea[]): WeeklySnapshot[] {
    if (ideas.length === 0) {
      return [];
    }

    // Find date range of ideas
    const dates = ideas.map(i => new Date(i.created_at));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const snapshots: WeeklySnapshot[] = [];
    let currentWeekStart = this.getWeekStart(minDate);

    while (currentWeekStart <= maxDate) {
      const weekEnd = this.getWeekEnd(currentWeekStart);

      // Filter ideas for this week
      const weekIdeas = ideas.filter(idea => {
        const ideaDate = new Date(idea.created_at);
        return ideaDate >= currentWeekStart && ideaDate <= weekEnd;
      });

      if (weekIdeas.length > 0) {
        snapshots.push({
          weekStart: currentWeekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          scanTypes: this.calculateScanTypeStats(weekIdeas),
          overall: this.calculateOverallStats(weekIdeas),
          projectBreakdown: this.groupByField(weekIdeas, i => i.project_id),
          contextBreakdown: this.groupByField(weekIdeas, i => i.context_id)
        });
      }

      // Move to next week
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return snapshots;
  }

  /**
   * Compute aggregated statistics
   */
  private computeAggregatedStats(key: CacheKey): AggregatedStats {
    const allIdeas = ideaDb.getAllIdeas();
    const { start, end } = this.getDateRange(key.timeWindow);

    const filteredIdeas = this.filterIdeas(
      allIdeas,
      key.projectId,
      key.contextId,
      start,
      end
    );

    const scanTypeStats = this.calculateScanTypeStats(filteredIdeas);
    const overall = this.calculateOverallStats(filteredIdeas);

    const projectMap = this.groupByField(filteredIdeas, idea => idea.project_id);
    const projects = Array.from(projectMap.entries()).map(([projectId, totalIdeas]) => ({
      projectId,
      name: projectId,
      totalIdeas
    }));

    const contextMap = this.groupByField(filteredIdeas, idea => idea.context_id);
    const contexts = Array.from(contextMap.entries()).map(([contextId, totalIdeas]) => ({
      contextId,
      name: contextId,
      totalIdeas
    }));

    const weeklySnapshots = this.generateWeeklySnapshots(filteredIdeas);

    return {
      scanTypes: scanTypeStats,
      overall,
      projects,
      contexts,
      weeklySnapshots,
      lastUpdated: Date.now(),
      cacheKey: this.generateCacheKey(key)
    };
  }

  /**
   * Get cached or compute aggregated statistics
   */
  public getAggregatedStats(key: CacheKey): AggregatedStats {
    const cacheKeyString = this.generateCacheKey(key);
    const cachedEntry = this.cache.get(cacheKeyString);

    // Check if cache is valid
    if (cachedEntry && cachedEntry.version === this.globalVersion && cachedEntry.expiresAt > Date.now()) {
      return cachedEntry.data;
    }

    // Compute fresh stats
    const stats = this.computeAggregatedStats(key);

    // Store in cache
    this.cache.set(cacheKeyString, {
      data: stats,
      createdAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
      version: this.globalVersion
    });

    // Evict old entries if cache is too large
    this.evictOldEntries();

    return stats;
  }

  /**
   * Get stats with custom date range (bypasses standard time windows)
   */
  public getStatsWithDateRange(
    projectId: string | null,
    contextId: string | null,
    startDate: string | null,
    endDate: string | null
  ): AggregatedStats {
    const allIdeas = ideaDb.getAllIdeas();

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    const filteredIdeas = this.filterIdeas(allIdeas, projectId, contextId, start, end);

    const scanTypeStats = this.calculateScanTypeStats(filteredIdeas);
    const overall = this.calculateOverallStats(filteredIdeas);

    const projectMap = this.groupByField(filteredIdeas, idea => idea.project_id);
    const projects = Array.from(projectMap.entries()).map(([projectId, totalIdeas]) => ({
      projectId,
      name: projectId,
      totalIdeas
    }));

    const contextMap = this.groupByField(filteredIdeas, idea => idea.context_id);
    const contexts = Array.from(contextMap.entries()).map(([contextId, totalIdeas]) => ({
      contextId,
      name: contextId,
      totalIdeas
    }));

    const weeklySnapshots = this.generateWeeklySnapshots(filteredIdeas);

    return {
      scanTypes: scanTypeStats,
      overall,
      projects,
      contexts,
      weeklySnapshots,
      lastUpdated: Date.now(),
      cacheKey: `${projectId || 'all'}:${contextId || 'all'}:custom`
    };
  }

  /**
   * Invalidate all cache entries
   * Call this when ideas data changes
   */
  public invalidateCache(): void {
    this.globalVersion++;
    // Optionally clear all entries immediately
    // this.cache.clear();
  }

  /**
   * Invalidate cache for specific project
   */
  public invalidateCacheForProject(projectId: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(`${projectId}:`) || key.startsWith('all:')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache for specific context
   */
  public invalidateCacheForContext(contextId: string): void {
    for (const [key] of this.cache) {
      const parsed = this.parseCacheKey(key);
      if (parsed.contextId === contextId || parsed.contextId === null) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict old cache entries when cache is too large
   */
  private evictOldEntries(): void {
    if (this.cache.size <= MAX_CACHE_ENTRIES) {
      return;
    }

    // Get entries sorted by creation time
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    size: number;
    version: number;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.createdAt,
      expiresIn: entry.expiresAt - now
    }));

    return {
      size: this.cache.size,
      version: this.globalVersion,
      entries
    };
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Pre-warm cache with common queries
   */
  public preWarmCache(): void {
    // Pre-compute stats for common time windows
    const timeWindows: CacheKey['timeWindow'][] = ['all', 'week', 'month', 'quarter'];

    for (const timeWindow of timeWindows) {
      this.getAggregatedStats({
        projectId: null,
        contextId: null,
        timeWindow
      });
    }
  }
}

// Export singleton instance
export const analyticsAggregationService = new AnalyticsAggregationService();

// Export for testing
export { AnalyticsAggregationService };
