/**
 * Group Health Repository
 * Handles CRUD operations for context group health scans
 */

import { getDatabase } from '../connection';
import type {
  DbGroupHealthScan,
  HealthScanStatus,
  HealthScanSummary,
  CreateHealthScanInput,
  UpdateHealthScanInput,
} from '../models/group-health.types';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

export const groupHealthRepository = {
  /**
   * Create a new health scan
   */
  create: (input: CreateHealthScanInput): DbGroupHealthScan => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO group_health_scans (
        id, group_id, project_id, status, execution_id, created_at, updated_at
      )
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `);

    stmt.run(id, input.group_id, input.project_id, input.execution_id || null, now, now);

    return selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    )!;
  },

  /**
   * Get scan by ID
   */
  getById: (id: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    return selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    );
  },

  /**
   * Get latest scan for a group
   */
  getLatestByGroup: (groupId: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    return selectOne<DbGroupHealthScan>(
      db,
      `SELECT * FROM group_health_scans
       WHERE group_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      groupId
    );
  },

  /**
   * Get latest completed scan for a group
   */
  getLatestCompletedByGroup: (groupId: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    return selectOne<DbGroupHealthScan>(
      db,
      `SELECT * FROM group_health_scans
       WHERE group_id = ? AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`,
      groupId
    );
  },

  /**
   * Get running scan for a group (should be 0 or 1)
   */
  getRunningByGroup: (groupId: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    return selectOne<DbGroupHealthScan>(
      db,
      `SELECT * FROM group_health_scans
       WHERE group_id = ? AND status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`,
      groupId
    );
  },

  /**
   * Get all scans for a group
   */
  getByGroup: (groupId: string, limit: number = 10): DbGroupHealthScan[] => {
    const db = getDatabase();
    return selectAll<DbGroupHealthScan>(
      db,
      `SELECT * FROM group_health_scans
       WHERE group_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      groupId,
      limit
    );
  },

  /**
   * Get all scans for a project
   */
  getByProject: (projectId: string, limit: number = 50): DbGroupHealthScan[] => {
    const db = getDatabase();
    return selectAll<DbGroupHealthScan>(
      db,
      `SELECT * FROM group_health_scans
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Start a scan (update status to running)
   */
  startScan: (id: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE group_health_scans
      SET status = 'running', started_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, now, id);

    return selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    );
  },

  /**
   * Update scan with results
   */
  update: (id: string, updates: UpdateHealthScanInput): DbGroupHealthScan | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.health_score !== undefined) {
      setClauses.push('health_score = ?');
      values.push(updates.health_score);
    }
    if (updates.issues_found !== undefined) {
      setClauses.push('issues_found = ?');
      values.push(updates.issues_found);
    }
    if (updates.issues_fixed !== undefined) {
      setClauses.push('issues_fixed = ?');
      values.push(updates.issues_fixed);
    }
    if (updates.scan_summary !== undefined) {
      setClauses.push('scan_summary = ?');
      values.push(JSON.stringify(updates.scan_summary));
    }
    if (updates.git_commit_hash !== undefined) {
      setClauses.push('git_commit_hash = ?');
      values.push(updates.git_commit_hash);
    }
    if (updates.git_pushed !== undefined) {
      setClauses.push('git_pushed = ?');
      values.push(updates.git_pushed ? 1 : 0);
    }
    if (updates.started_at !== undefined) {
      setClauses.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completed_at);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE group_health_scans
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    );
  },

  /**
   * Complete a scan with results
   */
  completeScan: (
    id: string,
    data: {
      health_score: number;
      issues_found: number;
      issues_fixed: number;
      scan_summary: HealthScanSummary;
      git_commit_hash?: string;
      git_pushed?: boolean;
    }
  ): DbGroupHealthScan | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE group_health_scans
      SET status = 'completed',
          completed_at = ?,
          updated_at = ?,
          health_score = ?,
          issues_found = ?,
          issues_fixed = ?,
          scan_summary = ?,
          git_commit_hash = ?,
          git_pushed = ?
      WHERE id = ?
    `);

    stmt.run(
      now,
      now,
      data.health_score,
      data.issues_found,
      data.issues_fixed,
      JSON.stringify(data.scan_summary),
      data.git_commit_hash || null,
      data.git_pushed ? 1 : 0,
      id
    );

    // Also update the context_groups table with the health score
    const scan = selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    );

    if (scan) {
      db.prepare(`
        UPDATE context_groups
        SET health_score = ?, last_scan_at = ?
        WHERE id = ?
      `).run(data.health_score, now, scan.group_id);
    }

    return scan;
  },

  /**
   * Mark scan as failed
   */
  failScan: (id: string): DbGroupHealthScan | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE group_health_scans
      SET status = 'failed', completed_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, now, id);

    return selectOne<DbGroupHealthScan>(
      db,
      'SELECT * FROM group_health_scans WHERE id = ?',
      id
    );
  },

  /**
   * Delete scan by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM group_health_scans WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all scans for a group
   */
  deleteByGroup: (groupId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM group_health_scans WHERE group_id = ?');
    const result = stmt.run(groupId);
    return result.changes;
  },

  /**
   * Delete all scans for a project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM group_health_scans WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Clean up old failed/pending scans
   */
  cleanupStale: (olderThanDays: number = 7): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM group_health_scans
      WHERE status IN ('failed', 'pending') AND created_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  },

  /**
   * Get scan statistics for a project
   */
  getStats: (projectId: string): {
    totalScans: number;
    completedScans: number;
    failedScans: number;
    averageHealthScore: number | null;
    totalIssuesFound: number;
    totalIssuesFixed: number;
  } => {
    const db = getDatabase();

    const stats = selectOne<{
      totalScans: number;
      completedScans: number;
      failedScans: number;
      avgScore: number | null;
      totalFound: number;
      totalFixed: number;
    }>(
      db,
      `SELECT
        COUNT(*) as totalScans,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedScans,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedScans,
        AVG(CASE WHEN status = 'completed' THEN health_score ELSE NULL END) as avgScore,
        SUM(COALESCE(issues_found, 0)) as totalFound,
        SUM(COALESCE(issues_fixed, 0)) as totalFixed
       FROM group_health_scans
       WHERE project_id = ?`,
      projectId
    );

    return {
      totalScans: stats?.totalScans ?? 0,
      completedScans: stats?.completedScans ?? 0,
      failedScans: stats?.failedScans ?? 0,
      averageHealthScore: stats?.avgScore ?? null,
      totalIssuesFound: stats?.totalFound ?? 0,
      totalIssuesFixed: stats?.totalFixed ?? 0,
    };
  },
};
