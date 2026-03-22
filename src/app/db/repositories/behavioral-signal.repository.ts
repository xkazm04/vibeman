/**
 * Behavioral Signal Repository
 * Handles CRUD operations for behavioral signals (user activity tracking)
 *
 * All operations target the hot-writes database (hot-writes.db) to avoid
 * write contention with the main goals.db. The hot-writes DB is optimised
 * for high-frequency append-only workloads like signal recording.
 */

import { getHotWritesDatabase } from '../hot-writes';
import { getDatabase } from '../connection';
import type {
  DbBehavioralSignal,
  CreateBehavioralSignalInput,
} from '../models/brain.types';
import { SIGNAL_MIN_WEIGHT } from '@/lib/brain/config';
import type { BehavioralSignalType } from '@/types/signals';
import { getAllSignalTypes } from '@/types/signals';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/** Max IDs per SQL IN() clause — well under SQLite's 999 variable limit */
const CLEANUP_BATCH_SIZE = 500;

/**
 * Clean up evidence junction rows in the main DB for deleted signal IDs.
 * Required because signals live in hot-writes.db (separate SQLite file)
 * so the trigger_delete_signal_evidence trigger on the main DB never fires.
 * Batches into chunks of CLEANUP_BATCH_SIZE to stay within SQLite param limits.
 */
function cleanupSignalEvidence(signalIds: string[]): void {
  if (signalIds.length === 0) return;
  try {
    const mainDb = getDatabase();
    for (let i = 0; i < signalIds.length; i += CLEANUP_BATCH_SIZE) {
      const chunk = signalIds.slice(i, i + CLEANUP_BATCH_SIZE);
      const placeholders = chunk.map(() => '?').join(',');
      mainDb.prepare(
        `DELETE FROM brain_insight_evidence
         WHERE evidence_type = 'signal' AND evidence_id IN (${placeholders})`
      ).run(...chunk);
    }
  } catch {
    // Best-effort cleanup — don't break signal deletion if main DB is unavailable
  }
}

/**
 * Get the start of the current week (Monday 00:00 UTC) as ISO string.
 * Used to identify decay cycles so signals are only decayed once per week.
 */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString();
}

export const behavioralSignalRepository = {
  /**
   * Create a new behavioral signal
   */
  create: (input: CreateBehavioralSignalInput): DbBehavioralSignal => {
    const db = getHotWritesDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO behavioral_signals (
        id, project_id, signal_type, context_id, context_name,
        data, weight, timestamp, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.id,
      input.project_id,
      input.signal_type,
      input.context_id || null,
      input.context_name || null,
      input.data,
      input.weight ?? 1.0,
      input.timestamp,
      now
    );

    return selectOne<DbBehavioralSignal>(
      db,
      'SELECT * FROM behavioral_signals WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get signals by project
   */
  getByProject: (
    projectId: string,
    options?: {
      signalType?: BehavioralSignalType;
      contextId?: string;
      limit?: number;
      since?: string;
    }
  ): DbBehavioralSignal[] => {
    const db = getHotWritesDatabase();
    let query = 'SELECT * FROM behavioral_signals WHERE project_id = ?';
    const params: unknown[] = [projectId];

    if (options?.signalType) {
      query += ' AND signal_type = ?';
      params.push(options.signalType);
    }

    if (options?.contextId) {
      query += ' AND context_id = ?';
      params.push(options.contextId);
    }

    if (options?.since) {
      query += ' AND timestamp >= ?';
      params.push(options.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return selectAll<DbBehavioralSignal>(db, query, ...params);
  },

  /**
   * Get signals by type within a time window
   */
  getByTypeAndWindow: (
    projectId: string,
    signalType: BehavioralSignalType,
    windowDays: number = 7
  ): DbBehavioralSignal[] => {
    const db = getHotWritesDatabase();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    return selectAll<DbBehavioralSignal>(
      db,
      `SELECT * FROM behavioral_signals
       WHERE project_id = ? AND signal_type = ? AND timestamp >= ?
       ORDER BY timestamp DESC`,
      projectId,
      signalType,
      since
    );
  },

  /**
   * Get signals by type within an exact date range (SQL-filtered)
   */
  getByTypeAndRange: (
    projectId: string,
    signalType: BehavioralSignalType,
    startDate: string,
    endDate: string
  ): DbBehavioralSignal[] => {
    const db = getHotWritesDatabase();
    return selectAll<DbBehavioralSignal>(
      db,
      `SELECT * FROM behavioral_signals
       WHERE project_id = ? AND signal_type = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC`,
      projectId,
      signalType,
      startDate,
      endDate
    );
  },

  /**
   * Get recent context activity (aggregated)
   */
  getContextActivity: (
    projectId: string,
    windowDays: number = 7
  ): Array<{ context_id: string; context_name: string; signal_count: number; total_weight: number }> => {
    const db = getHotWritesDatabase();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    return selectAll(
      db,
      `SELECT
        context_id,
        context_name,
        COUNT(*) as signal_count,
        SUM(weight) as total_weight
       FROM behavioral_signals
       WHERE project_id = ? AND context_id IS NOT NULL AND timestamp >= ?
       GROUP BY context_id
       ORDER BY total_weight DESC`,
      projectId,
      since
    );
  },

  /**
   * Get signal count by type for a project
   * Derives the complete type list from the canonical SignalType enum
   */
  getCountByType: (
    projectId: string,
    windowDays: number = 7
  ): Record<BehavioralSignalType, number> => {
    const db = getHotWritesDatabase();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = selectAll<{ signal_type: BehavioralSignalType; count: number }>(
      db,
      `SELECT signal_type, COUNT(*) as count
       FROM behavioral_signals
       WHERE project_id = ? AND timestamp >= ?
       GROUP BY signal_type`,
      projectId,
      since
    );

    // Initialize all signal types to 0 using canonical enum
    const result: Record<string, number> = {};
    for (const type of getAllSignalTypes()) {
      result[type] = 0;
    }

    // Fill in actual counts
    for (const row of rows) {
      result[row.signal_type] = row.count;
    }

    return result as Record<BehavioralSignalType, number>;
  },

  /**
   * Apply decay to old signals (reduce weight over time).
   * Uses batched updates with decay_applied_at tracking to:
   * - Skip signals already decayed in the current cycle
   * - Process in 1000-row chunks with separate transactions to avoid table locks
   * - Leave reads unblocked during the decay process
   *
   * @param projectId - Project to decay signals for
   * @param decayFactor - Multiplier for weight (0.8-0.99, default 0.9)
   * @param olderThanDays - Only decay signals older than this (derived from retentionDays × DECAY_START_FRACTION)
   * @returns Number of signals updated
   */
  applyDecay: (projectId: string, decayFactor: number, olderThanDays: number): number => {
    const db = getHotWritesDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const now = getCurrentTimestamp();
    const BATCH_SIZE = 1000;

    // Use decay_applied_at to skip already-decayed signals in this cycle.
    // A "cycle" is identified by the current week boundary (Monday 00:00 UTC).
    const weekStart = getWeekStart();

    const batchStmt = db.prepare(`
      UPDATE behavioral_signals
      SET weight = weight * ?,
          decay_applied_at = ?
      WHERE id IN (
        SELECT id FROM behavioral_signals
        WHERE project_id = ?
          AND timestamp < ?
          AND weight > ${SIGNAL_MIN_WEIGHT}
          AND (decay_applied_at IS NULL OR decay_applied_at < ?)
        LIMIT ?
      )
    `);

    let totalChanges = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = batchStmt.run(decayFactor, now, projectId, cutoff, weekStart, BATCH_SIZE);
      totalChanges += result.changes;
      if (result.changes < BATCH_SIZE) break;
    }

    return totalChanges;
  },

  /**
   * Delete old signals beyond retention period.
   * Processes in batches of CLEANUP_BATCH_SIZE to avoid loading all IDs into
   * memory and to stay within SQLite's variable-number limit for evidence cleanup.
   */
  deleteOld: (projectId: string, retentionDays: number = 30): number => {
    const db = getHotWritesDatabase();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    let totalChanges = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = selectAll<{ id: string }>(
        db,
        'SELECT id FROM behavioral_signals WHERE project_id = ? AND timestamp < ? LIMIT ?',
        projectId, cutoff, CLEANUP_BATCH_SIZE
      ).map(r => r.id);

      if (batch.length === 0) break;

      cleanupSignalEvidence(batch);

      const placeholders = batch.map(() => '?').join(',');
      const result = db.prepare(
        `DELETE FROM behavioral_signals WHERE id IN (${placeholders})`
      ).run(...batch);
      totalChanges += result.changes;

      if (batch.length < CLEANUP_BATCH_SIZE) break;
    }

    return totalChanges;
  },

  /**
   * Delete a single signal by ID
   */
  deleteById: (id: string): boolean => {
    const db = getHotWritesDatabase();
    const stmt = db.prepare('DELETE FROM behavioral_signals WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes > 0) {
      cleanupSignalEvidence([id]);
    }
    return result.changes > 0;
  },

  /**
   * Delete signals by project.
   * Batches evidence cleanup to stay within SQLite param limits.
   */
  deleteByProject: (projectId: string): number => {
    const db = getHotWritesDatabase();
    let totalChanges = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = selectAll<{ id: string }>(
        db,
        'SELECT id FROM behavioral_signals WHERE project_id = ? LIMIT ?',
        projectId, CLEANUP_BATCH_SIZE
      ).map(r => r.id);

      if (batch.length === 0) break;

      cleanupSignalEvidence(batch);

      const placeholders = batch.map(() => '?').join(',');
      const result = db.prepare(
        `DELETE FROM behavioral_signals WHERE id IN (${placeholders})`
      ).run(...batch);
      totalChanges += result.changes;

      if (batch.length < CLEANUP_BATCH_SIZE) break;
    }

    return totalChanges;
  },

  /**
   * Get daily heatmap data: signal count and decay-weighted total per day,
   * optionally broken down by signal type and context.
   */
  getDailyHeatmap: (
    projectId: string,
    windowDays: number = 90
  ): Array<{
    date: string;
    signal_type: BehavioralSignalType;
    context_id: string | null;
    context_name: string | null;
    signal_count: number;
    total_weight: number;
  }> => {
    const db = getHotWritesDatabase();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    return selectAll(
      db,
      `SELECT
        DATE(timestamp) as date,
        signal_type,
        context_id,
        context_name,
        COUNT(*) as signal_count,
        SUM(weight) as total_weight
       FROM behavioral_signals
       WHERE project_id = ? AND timestamp >= ?
       GROUP BY DATE(timestamp), signal_type, context_id
       ORDER BY date ASC`,
      projectId,
      since
    );
  },

  /**
   * Get temporal aggregation: signal counts grouped by hour-of-day and day-of-week.
   * Used for developer rhythm heatmap showing activity patterns by time slot.
   *
   * day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday (SQLite %w convention)
   * hour: 0-23 (local time from timestamp)
   */
  getTemporalAggregation: (
    projectId: string,
    windowDays: number = 30
  ): Array<{
    hour: number;
    day_of_week: number;
    signal_type: string;
    signal_count: number;
    total_weight: number;
  }> => {
    const db = getHotWritesDatabase();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    return selectAll(
      db,
      `SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        CAST(strftime('%w', timestamp) AS INTEGER) as day_of_week,
        signal_type,
        COUNT(*) as signal_count,
        SUM(weight) as total_weight
       FROM behavioral_signals
       WHERE project_id = ? AND timestamp >= ?
       GROUP BY hour, day_of_week, signal_type
       ORDER BY day_of_week ASC, hour ASC`,
      projectId,
      since
    );
  },

  /**
   * Check if any signals exist for a project
   */
  hasSignals: (projectId: string): boolean => {
    const db = getHotWritesDatabase();
    const result = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM behavioral_signals WHERE project_id = ? LIMIT 1',
      projectId
    );
    return (result?.count ?? 0) > 0;
  },

  /**
   * Get child signals that belong to a specific cluster
   */
  getByClusterId: (clusterId: string): DbBehavioralSignal[] => {
    const db = getHotWritesDatabase();
    return selectAll<DbBehavioralSignal>(
      db,
      `SELECT * FROM behavioral_signals
       WHERE cluster_id = ?
       ORDER BY timestamp ASC`,
      clusterId
    );
  },

  /**
   * Get signals excluding those already absorbed into clusters.
   * Useful for canvas/timeline views where clusters replace their children.
   */
  getUnclusteredByProject: (
    projectId: string,
    options?: {
      signalType?: BehavioralSignalType;
      contextId?: string;
      limit?: number;
      since?: string;
    }
  ): DbBehavioralSignal[] => {
    const db = getHotWritesDatabase();
    let query = 'SELECT * FROM behavioral_signals WHERE project_id = ? AND cluster_id IS NULL';
    const params: unknown[] = [projectId];

    if (options?.signalType) {
      query += ' AND signal_type = ?';
      params.push(options.signalType);
    }

    if (options?.contextId) {
      query += ' AND context_id = ?';
      params.push(options.contextId);
    }

    if (options?.since) {
      query += ' AND timestamp >= ?';
      params.push(options.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return selectAll<DbBehavioralSignal>(db, query, ...params);
  },
};
