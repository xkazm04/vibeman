/**
 * Behavioral Signal Repository
 * Handles CRUD operations for behavioral signals (user activity tracking)
 */

import { getDatabase } from '../connection';
import type {
  DbBehavioralSignal,
  BehavioralSignalType,
  CreateBehavioralSignalInput,
} from '../models/brain.types';
import { getCurrentTimestamp, selectOne, selectAll, buildUpdateQuery } from './repository.utils';

export const behavioralSignalRepository = {
  /**
   * Create a new behavioral signal
   */
  create: (input: CreateBehavioralSignalInput): DbBehavioralSignal => {
    const db = getDatabase();
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
    const db = getDatabase();
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
    const db = getDatabase();
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
   * Get recent context activity (aggregated)
   */
  getContextActivity: (
    projectId: string,
    windowDays: number = 7
  ): Array<{ context_id: string; context_name: string; signal_count: number; total_weight: number }> => {
    const db = getDatabase();
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
   */
  getCountByType: (
    projectId: string,
    windowDays: number = 7
  ): Record<BehavioralSignalType, number> => {
    const db = getDatabase();
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

    const result: Record<BehavioralSignalType, number> = {
      git_activity: 0,
      api_focus: 0,
      context_focus: 0,
      implementation: 0,
    };

    for (const row of rows) {
      result[row.signal_type] = row.count;
    }

    return result;
  },

  /**
   * Apply decay to old signals (reduce weight over time)
   * Batches updates in chunks of 1000 to avoid locking SQLite for extended periods.
   */
  applyDecay: (projectId: string, decayFactor: number = 0.9, olderThanDays: number = 7): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const BATCH_SIZE = 1000;

    const batchStmt = db.prepare(`
      UPDATE behavioral_signals
      SET weight = weight * ?
      WHERE id IN (
        SELECT id FROM behavioral_signals
        WHERE project_id = ? AND timestamp < ? AND weight > 0.01
        LIMIT ?
      )
    `);

    let totalChanges = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = batchStmt.run(decayFactor, projectId, cutoff, BATCH_SIZE);
      totalChanges += result.changes;
      if (result.changes < BATCH_SIZE) break;
    }

    return totalChanges;
  },

  /**
   * Delete old signals beyond retention period
   */
  deleteOld: (projectId: string, retentionDays: number = 30): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM behavioral_signals
      WHERE project_id = ? AND timestamp < ?
    `);

    const result = stmt.run(projectId, cutoff);
    return result.changes;
  },

  /**
   * Delete a single signal by ID
   */
  deleteById: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM behavioral_signals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete signals by project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM behavioral_signals WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Check if any signals exist for a project
   */
  hasSignals: (projectId: string): boolean => {
    const db = getDatabase();
    const result = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM behavioral_signals WHERE project_id = ? LIMIT 1',
      projectId
    );
    return (result?.count ?? 0) > 0;
  },
};
