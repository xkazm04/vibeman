/**
 * Direction Preference Profile Repository
 *
 * Caches computed preference profiles from pair decision analysis.
 * Profiles are invalidated when new pair decisions are made and
 * recomputed on next read.
 */

import { getDatabase } from '../connection';
import { selectOne } from './repository.utils';

export interface DbPreferenceProfile {
  project_id: string;
  vector_json: string;
  sample_count: number;
  axis_counts_json: string;
  stability: number;
  computed_at: string;
  invalidated_at: string | null;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const directionPreferenceRepository = {
  /**
   * Get cached preference profile for a project.
   * Returns null if no cache or if invalidated/expired.
   */
  get(projectId: string): DbPreferenceProfile | null {
    const db = getDatabase();
    const row = selectOne<DbPreferenceProfile>(
      db,
      'SELECT * FROM direction_preference_profiles WHERE project_id = ?',
      projectId
    );

    if (!row) return null;

    // Check if invalidated
    if (row.invalidated_at) return null;

    // Check TTL
    const computedTime = new Date(row.computed_at).getTime();
    if (Date.now() - computedTime > CACHE_TTL_MS) return null;

    return row;
  },

  /**
   * Upsert a preference profile into cache.
   */
  set(
    projectId: string,
    vectorJson: string,
    sampleCount: number,
    axisCountsJson: string,
    stability: number,
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO direction_preference_profiles
        (project_id, vector_json, sample_count, axis_counts_json, stability, computed_at, invalidated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(project_id) DO UPDATE SET
        vector_json = excluded.vector_json,
        sample_count = excluded.sample_count,
        axis_counts_json = excluded.axis_counts_json,
        stability = excluded.stability,
        computed_at = excluded.computed_at,
        invalidated_at = NULL
    `).run(projectId, vectorJson, sampleCount, axisCountsJson, stability, now);
  },

  /**
   * Invalidate the cached profile for a project.
   * Called when a new pair decision is made.
   */
  invalidate(projectId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE direction_preference_profiles SET invalidated_at = ? WHERE project_id = ?'
    ).run(now, projectId);
  },
};
