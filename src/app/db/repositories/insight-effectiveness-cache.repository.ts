/**
 * Insight Effectiveness Cache Repository
 *
 * Manages cached insight effectiveness scores to avoid expensive
 * O(insights × directions) recalculation on every API request.
 * Cache entries have a 24-hour TTL and are invalidated on any
 * direction status change (accepted, rejected, reverted, deleted).
 */

import { getDatabase } from '../connection';
import { EFFECTIVENESS_CACHE_TTL_MS } from '@/lib/brain/config';

const CACHE_TTL_MS = EFFECTIVENESS_CACHE_TTL_MS;

export interface CachedEffectivenessResult {
  insightsJson: string;
  summaryJson: string;
  cachedAt: string;
  version: number;
}

export const insightEffectivenessCacheRepository = {
  /**
   * Get cached effectiveness data if it exists and is fresh (< 24h old).
   * Returns null if cache miss or stale.
   */
  get(projectId: string, minDirections: number, windowDays: number = 90): CachedEffectivenessResult | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT insights_json, summary_json, cached_at, version
      FROM insight_effectiveness_cache
      WHERE project_id = ? AND min_directions = ? AND window_days = ?
    `).get(projectId, minDirections, windowDays) as {
      insights_json: string;
      summary_json: string;
      cached_at: string;
      version: number;
    } | undefined;

    if (!row) return null;

    // Check TTL
    const cachedTime = new Date(row.cached_at).getTime();
    if (Date.now() - cachedTime > CACHE_TTL_MS) {
      return null; // Stale
    }

    return {
      insightsJson: row.insights_json,
      summaryJson: row.summary_json,
      cachedAt: row.cached_at,
      version: row.version || 1,
    };
  },

  /**
   * Store computed effectiveness results in cache.
   * Uses INSERT OR REPLACE to upsert.
   * Increments version on every write to enable client-side staleness detection.
   */
  set(projectId: string, minDirections: number, windowDays: number, insightsJson: string, summaryJson: string): void {
    const db = getDatabase();

    // Get current version or default to 0
    const current = db.prepare(`
      SELECT version FROM insight_effectiveness_cache
      WHERE project_id = ? AND min_directions = ? AND window_days = ?
    `).get(projectId, minDirections, windowDays) as { version: number } | undefined;

    const newVersion = (current?.version || 0) + 1;

    db.prepare(`
      INSERT OR REPLACE INTO insight_effectiveness_cache
        (project_id, min_directions, window_days, insights_json, summary_json, cached_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, minDirections, windowDays, insightsJson, summaryJson, new Date().toISOString(), newVersion);
  },

  /**
   * Invalidate cache for a specific project.
   * Called when direction status changes (accepted, rejected, reverted, deleted).
   * Deletes cached entries to force recalculation on next request.
   */
  invalidate(projectId: string): void {
    const db = getDatabase();
    db.prepare(`
      DELETE FROM insight_effectiveness_cache
      WHERE project_id = ?
    `).run(projectId);
  },

  /**
   * Invalidate all cached entries (e.g., on schema changes).
   */
  invalidateAll(): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM insight_effectiveness_cache`).run();
  },
};
