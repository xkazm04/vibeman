import { getDatabase } from '../connection';
import {
  DbScanHistory,
  DbScanPrediction,
  DbFileChangePattern,
  ScanHistory,
  ScanPrediction,
  FileChangePattern,
} from '../models/scan-prediction.types';

/**
 * Scan History Repository
 * Tracks scan execution history for pattern analysis
 */
export const scanHistoryRepository = {
  /**
   * Create a new scan history entry
   */
  create: (history: Omit<DbScanHistory, 'created_at'>): DbScanHistory => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scan_history (
        id, project_id, scan_type, context_id, triggered_by, file_changes,
        commit_sha, execution_time_ms, status, error_message, findings_count,
        staleness_score, executed_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      history.id,
      history.project_id,
      history.scan_type,
      history.context_id || null,
      history.triggered_by,
      history.file_changes || null,
      history.commit_sha || null,
      history.execution_time_ms || null,
      history.status,
      history.error_message || null,
      history.findings_count || 0,
      history.staleness_score || null,
      history.executed_at,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM scan_history WHERE id = ?');
    return selectStmt.get(history.id) as DbScanHistory;
  },

  /**
   * Get scan history for a project
   */
  getByProject: (projectId: string, limit = 100): ScanHistory[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_history
      WHERE project_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectId, limit) as DbScanHistory[];
    return rows.map((row) => ({
      ...row,
      file_changes: row.file_changes ? JSON.parse(row.file_changes) : [],
    }));
  },

  /**
   * Get scan history for a specific scan type
   */
  getByScanType: (projectId: string, scanType: string, limit = 50): ScanHistory[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_history
      WHERE project_id = ? AND scan_type = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectId, scanType, limit) as DbScanHistory[];
    return rows.map((row) => ({
      ...row,
      file_changes: row.file_changes ? JSON.parse(row.file_changes) : [],
    }));
  },

  /**
   * Get last scan execution for a scan type
   */
  getLastScan: (projectId: string, scanType: string, contextId?: string): ScanHistory | null => {
    const db = getDatabase();

    const stmt = contextId
      ? db.prepare(`
          SELECT * FROM scan_history
          WHERE project_id = ? AND scan_type = ? AND context_id = ?
          ORDER BY executed_at DESC
          LIMIT 1
        `)
      : db.prepare(`
          SELECT * FROM scan_history
          WHERE project_id = ? AND scan_type = ? AND context_id IS NULL
          ORDER BY executed_at DESC
          LIMIT 1
        `);

    const row = contextId
      ? stmt.get(projectId, scanType, contextId) as DbScanHistory | undefined
      : stmt.get(projectId, scanType) as DbScanHistory | undefined;

    if (!row) return null;

    return {
      ...row,
      file_changes: row.file_changes ? JSON.parse(row.file_changes) : [],
    };
  },

  /**
   * Get scan frequency statistics
   */
  getScanFrequency: (
    projectId: string,
    scanType: string
  ): { avgDaysBetweenScans: number; scanCount: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as scanCount,
        MIN(executed_at) as firstScan,
        MAX(executed_at) as lastScan
      FROM scan_history
      WHERE project_id = ? AND scan_type = ? AND status = 'completed'
    `);

    const result = stmt.get(projectId, scanType) as any;

    if (!result || result.scanCount < 2) {
      return { avgDaysBetweenScans: 0, scanCount: result?.scanCount || 0 };
    }

    const first = new Date(result.firstScan).getTime();
    const last = new Date(result.lastScan).getTime();
    const daysDiff = (last - first) / (1000 * 60 * 60 * 24);
    const avgDaysBetweenScans = daysDiff / (result.scanCount - 1);

    return {
      avgDaysBetweenScans,
      scanCount: result.scanCount,
    };
  },

  /**
   * Delete old scan history entries (cleanup)
   */
  deleteOlderThan: (projectId: string, daysOld: number): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare(`
      DELETE FROM scan_history
      WHERE project_id = ? AND executed_at < ?
    `);

    const result = stmt.run(projectId, cutoffDate.toISOString());
    return result.changes;
  },
};

/**
 * Scan Prediction Repository
 * Manages AI-generated scan recommendations
 */
export const scanPredictionRepository = {
  /**
   * Create or update a scan prediction
   */
  upsert: (prediction: Omit<DbScanPrediction, 'created_at' | 'updated_at'>): DbScanPrediction => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if prediction exists
    const existing = db
      .prepare(
        `SELECT id FROM scan_predictions
         WHERE project_id = ? AND scan_type = ? AND COALESCE(context_id, '') = ?`
      )
      .get(prediction.project_id, prediction.scan_type, prediction.context_id || '') as
      | { id: string }
      | undefined;

    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE scan_predictions SET
          confidence_score = ?,
          staleness_score = ?,
          priority_score = ?,
          predicted_findings = ?,
          recommendation = ?,
          reasoning = ?,
          affected_file_patterns = ?,
          last_scan_at = ?,
          last_change_at = ?,
          next_recommended_at = ?,
          change_frequency_days = ?,
          scan_frequency_days = ?,
          calculated_at = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        prediction.confidence_score,
        prediction.staleness_score,
        prediction.priority_score,
        prediction.predicted_findings || null,
        prediction.recommendation,
        prediction.reasoning || null,
        prediction.affected_file_patterns || null,
        prediction.last_scan_at || null,
        prediction.last_change_at || null,
        prediction.next_recommended_at || null,
        prediction.change_frequency_days || null,
        prediction.scan_frequency_days || null,
        prediction.calculated_at,
        now,
        existing.id
      );

      const selectStmt = db.prepare('SELECT * FROM scan_predictions WHERE id = ?');
      return selectStmt.get(existing.id) as DbScanPrediction;
    } else {
      // Insert new
      const stmt = db.prepare(`
        INSERT INTO scan_predictions (
          id, project_id, scan_type, context_id, confidence_score, staleness_score,
          priority_score, predicted_findings, recommendation, reasoning,
          affected_file_patterns, last_scan_at, last_change_at, next_recommended_at,
          change_frequency_days, scan_frequency_days, dismissed, scheduled,
          calculated_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        prediction.id,
        prediction.project_id,
        prediction.scan_type,
        prediction.context_id || null,
        prediction.confidence_score,
        prediction.staleness_score,
        prediction.priority_score,
        prediction.predicted_findings || null,
        prediction.recommendation,
        prediction.reasoning || null,
        prediction.affected_file_patterns || null,
        prediction.last_scan_at || null,
        prediction.last_change_at || null,
        prediction.next_recommended_at || null,
        prediction.change_frequency_days || null,
        prediction.scan_frequency_days || null,
        prediction.dismissed || 0,
        prediction.scheduled || 0,
        prediction.calculated_at,
        now,
        now
      );

      const selectStmt = db.prepare('SELECT * FROM scan_predictions WHERE id = ?');
      return selectStmt.get(prediction.id) as DbScanPrediction;
    }
  },

  /**
   * Get all active predictions for a project (not dismissed)
   */
  getActiveByProject: (projectId: string): ScanPrediction[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_predictions
      WHERE project_id = ? AND dismissed = 0
      ORDER BY priority_score DESC
    `);

    const rows = stmt.all(projectId) as DbScanPrediction[];
    return rows.map((row) => ({
      ...row,
      affected_file_patterns: row.affected_file_patterns
        ? JSON.parse(row.affected_file_patterns)
        : [],
      dismissed: row.dismissed === 1,
      scheduled: row.scheduled === 1,
    }));
  },

  /**
   * Get top priority recommendations
   */
  getTopRecommendations: (
    projectId: string,
    limit = 5,
    recommendationType?: 'immediate' | 'soon' | 'scheduled'
  ): ScanPrediction[] => {
    const db = getDatabase();

    const stmt = recommendationType
      ? db.prepare(`
          SELECT * FROM scan_predictions
          WHERE project_id = ? AND dismissed = 0 AND recommendation = ?
          ORDER BY priority_score DESC
          LIMIT ?
        `)
      : db.prepare(`
          SELECT * FROM scan_predictions
          WHERE project_id = ? AND dismissed = 0
          ORDER BY priority_score DESC
          LIMIT ?
        `);

    const rows = recommendationType
      ? (stmt.all(projectId, recommendationType, limit) as DbScanPrediction[])
      : (stmt.all(projectId, limit) as DbScanPrediction[]);

    return rows.map((row) => ({
      ...row,
      affected_file_patterns: row.affected_file_patterns
        ? JSON.parse(row.affected_file_patterns)
        : [],
      dismissed: row.dismissed === 1,
      scheduled: row.scheduled === 1,
    }));
  },

  /**
   * Dismiss a prediction
   */
  dismiss: (predictionId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE scan_predictions SET dismissed = 1, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(new Date().toISOString(), predictionId);
    return result.changes > 0;
  },

  /**
   * Mark prediction as scheduled
   */
  markScheduled: (predictionId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE scan_predictions SET scheduled = 1, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(new Date().toISOString(), predictionId);
    return result.changes > 0;
  },

  /**
   * Delete old predictions (cleanup)
   */
  deleteOlderThan: (projectId: string, daysOld: number): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare(`
      DELETE FROM scan_predictions
      WHERE project_id = ? AND calculated_at < ?
    `);

    const result = stmt.run(projectId, cutoffDate.toISOString());
    return result.changes;
  },
};

/**
 * File Change Pattern Repository
 * Tracks file change patterns for prediction model
 */
export const fileChangePatternRepository = {
  /**
   * Create or update a file change pattern
   */
  upsert: (pattern: Omit<DbFileChangePattern, 'created_at' | 'updated_at'>): DbFileChangePattern => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if pattern exists
    const existing = db
      .prepare(`SELECT id FROM file_change_patterns WHERE project_id = ? AND file_pattern = ?`)
      .get(pattern.project_id, pattern.file_pattern) as { id: string } | undefined;

    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE file_change_patterns SET
          scan_types = ?,
          change_frequency_days = ?,
          last_changed_at = ?,
          commit_count = ?,
          total_changes = ?,
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        pattern.scan_types,
        pattern.change_frequency_days || null,
        pattern.last_changed_at || null,
        pattern.commit_count || 0,
        pattern.total_changes || 0,
        now,
        existing.id
      );

      const selectStmt = db.prepare('SELECT * FROM file_change_patterns WHERE id = ?');
      return selectStmt.get(existing.id) as DbFileChangePattern;
    } else {
      // Insert new
      const stmt = db.prepare(`
        INSERT INTO file_change_patterns (
          id, project_id, file_pattern, scan_types, change_frequency_days,
          last_changed_at, commit_count, total_changes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        pattern.id,
        pattern.project_id,
        pattern.file_pattern,
        pattern.scan_types,
        pattern.change_frequency_days || null,
        pattern.last_changed_at || null,
        pattern.commit_count || 0,
        pattern.total_changes || 0,
        now,
        now
      );

      const selectStmt = db.prepare('SELECT * FROM file_change_patterns WHERE id = ?');
      return selectStmt.get(pattern.id) as DbFileChangePattern;
    }
  },

  /**
   * Get all patterns for a project
   */
  getByProject: (projectId: string): FileChangePattern[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM file_change_patterns
      WHERE project_id = ?
      ORDER BY last_changed_at DESC
    `);

    const rows = stmt.all(projectId) as DbFileChangePattern[];
    return rows.map((row) => ({
      ...row,
      scan_types: JSON.parse(row.scan_types),
    }));
  },

  /**
   * Get patterns that affect a specific scan type
   */
  getByScanType: (projectId: string, scanType: string): FileChangePattern[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM file_change_patterns
      WHERE project_id = ? AND scan_types LIKE ?
      ORDER BY last_changed_at DESC
    `);

    const rows = stmt.all(projectId, `%"${scanType}"%`) as DbFileChangePattern[];
    return rows.map((row) => ({
      ...row,
      scan_types: JSON.parse(row.scan_types),
    }));
  },

  /**
   * Increment change count for a pattern
   */
  recordChange: (projectId: string, filePattern: string, commitSha?: string): boolean => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE file_change_patterns SET
        total_changes = total_changes + 1,
        commit_count = commit_count + ?,
        last_changed_at = ?,
        updated_at = ?
      WHERE project_id = ? AND file_pattern = ?
    `);

    const result = stmt.run(commitSha ? 1 : 0, now, now, projectId, filePattern);
    return result.changes > 0;
  },

  /**
   * Delete a pattern
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM file_change_patterns WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
