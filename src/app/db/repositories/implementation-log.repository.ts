import { getDatabase } from '../connection';
import { DbImplementationLog } from '../models/types';

/**
 * Implementation Log Repository
 * Handles all database operations for implementation logs
 */
export const implementationLogRepository = {
  /**
   * Get recent implementation logs for a project (last N logs)
   */
  getRecentLogsByProject: (projectId: string, limit: number = 5): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbImplementationLog[];
  },

  /**
   * Get all implementation logs for a project
   */
  getLogsByProject: (projectId: string): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbImplementationLog[];
  },

  /**
   * Get a single implementation log by ID
   */
  getLogById: (logId: string): DbImplementationLog | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE id = ?
    `);
    const log = stmt.get(logId) as DbImplementationLog | undefined;
    return log || null;
  },

  /**
   * Create a new implementation log
   */
  createLog: (log: {
    id: string;
    project_id: string;
    requirement_name: string;
    title: string;
    overview: string;
    tested?: boolean;
  }): DbImplementationLog => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO implementation_log (id, project_id, requirement_name, title, overview, tested, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.project_id,
      log.requirement_name,
      log.title,
      log.overview,
      log.tested ? 1 : 0,
      now
    );

    // Return the created log
    const selectStmt = db.prepare('SELECT * FROM implementation_log WHERE id = ?');
    return selectStmt.get(log.id) as DbImplementationLog;
  },

  /**
   * Update an implementation log (e.g., mark as tested)
   */
  updateLog: (id: string, updates: {
    tested?: boolean;
    overview?: string;
  }): DbImplementationLog | null => {
    const db = getDatabase();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.tested !== undefined) {
      updateFields.push('tested = ?');
      values.push(updates.tested ? 1 : 0);
    }
    if (updates.overview !== undefined) {
      updateFields.push('overview = ?');
      values.push(updates.overview);
    }

    if (updateFields.length === 0) {
      // No updates to apply
      const selectStmt = db.prepare('SELECT * FROM implementation_log WHERE id = ?');
      return selectStmt.get(id) as DbImplementationLog | null;
    }

    const updateQuery = `
      UPDATE implementation_log
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    values.push(id);

    const stmt = db.prepare(updateQuery);
    stmt.run(...values);

    // Return updated log
    const selectStmt = db.prepare('SELECT * FROM implementation_log WHERE id = ?');
    return selectStmt.get(id) as DbImplementationLog | null;
  },

  /**
   * Delete an implementation log
   */
  deleteLog: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM implementation_log WHERE id = ?');
    stmt.run(id);
  }
};
