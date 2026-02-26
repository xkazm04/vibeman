import { getDatabase } from '../connection';
import { DbScan } from '../models/types';

/**
 * Scan Repository
 * Handles all database operations for scans with token tracking
 */
export const scanRepository = {
  /**
   * Get all scans for a project
   */
  getScansByProject: (projectId: string): DbScan[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scans
      WHERE project_id = ?
      ORDER BY timestamp DESC
    `);
    return stmt.all(projectId) as DbScan[];
  },

  /**
   * Get scans for a project within a date range (SQL-level filtering)
   */
  getScansByProjectInRange: (projectId: string, startDate: string, endDate: string): DbScan[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scans
      WHERE project_id = ? AND created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, startDate, endDate) as DbScan[];
  },

  /**
   * Get a single scan by ID
   */
  getScanById: (scanId: string): DbScan | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    const scan = stmt.get(scanId) as DbScan | undefined;
    return scan || null;
  },

  /**
   * Create a new scan with optional token tracking
   */
  createScan: (scan: {
    id: string;
    project_id: string;
    scan_type: string;
    summary?: string;
    input_tokens?: number;
    output_tokens?: number;
  }): DbScan => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scans (id, project_id, scan_type, timestamp, summary, input_tokens, output_tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scan.id,
      scan.project_id,
      scan.scan_type,
      now,
      scan.summary || null,
      scan.input_tokens || null,
      scan.output_tokens || null,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    return selectStmt.get(scan.id) as DbScan;
  },

  /**
   * Update scan token usage (after LLM response)
   */
  updateTokenUsage: (scanId: string, inputTokens: number, outputTokens: number): DbScan | null => {
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE scans
      SET input_tokens = ?, output_tokens = ?
      WHERE id = ?
    `);

    const result = stmt.run(inputTokens, outputTokens, scanId);

    if (result.changes === 0) {
      return null; // Scan not found
    }

    const selectStmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    return selectStmt.get(scanId) as DbScan;
  },

  /**
   * Delete a scan (will cascade delete associated ideas)
   */
  deleteScan: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get total token usage statistics for a project
   */
  getTokenStatsByProject: (projectId: string): { totalInputTokens: number; totalOutputTokens: number; scanCount: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as totalInputTokens,
        COALESCE(SUM(output_tokens), 0) as totalOutputTokens,
        COUNT(*) as scanCount
      FROM scans
      WHERE project_id = ? AND (input_tokens IS NOT NULL OR output_tokens IS NOT NULL)
    `);

    const result = stmt.get(projectId) as any;
    return {
      totalInputTokens: result.totalInputTokens || 0,
      totalOutputTokens: result.totalOutputTokens || 0,
      scanCount: result.scanCount || 0
    };
  }
};
