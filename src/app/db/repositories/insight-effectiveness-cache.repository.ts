/**
 * Insight Effectiveness Cache Repository
 *
 * Manages cached insight effectiveness scores to avoid expensive
 * O(insights × directions) recalculation on every API request.
 * Cache entries have a 24-hour TTL and are invalidated when
 * directions are accepted (changing the underlying data).
 */

import { getDatabase } from '../connection';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedEffectivenessResult {
  insightsJson: string;
  summaryJson: string;
  cachedAt: string;
}

export const insightEffectivenessCacheRepository = {
  /**
   * Get cached effectiveness data if it exists and is fresh (< 24h old).
   * Returns null if cache miss or stale.
   */
  get(projectId: string, minDirections: number): CachedEffectivenessResult | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT insights_json, summary_json, cached_at
      FROM insight_effectiveness_cache
      WHERE project_id = ? AND min_directions = ?
    `).get(projectId, minDirections) as {
      insights_json: string;
      summary_json: string;
      cached_at: string;
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
    };
  },

  /**
   * Store computed effectiveness results in cache.
   * Uses INSERT OR REPLACE to upsert.
   */
  set(projectId: string, minDirections: number, insightsJson: string, summaryJson: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO insight_effectiveness_cache
        (project_id, min_directions, insights_json, summary_json, cached_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, minDirections, insightsJson, summaryJson, new Date().toISOString());
  },

  /**
   * Invalidate cache for a specific project.
   * Called when directions are accepted (data changes).
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
