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
   * Get implementation logs for a project within a date range (SQL-level filtering)
   */
  getLogsByProjectInRange: (projectId: string, startDate: string, endDate: string): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE project_id = ? AND created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, startDate, endDate) as DbImplementationLog[];
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
   * Get untested implementation logs for a project
   */
  getUntestedLogsByProject: (projectId: string): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE project_id = ? AND tested = 0
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbImplementationLog[];
  },

  /**
   * Get untested implementation logs for a project with pagination
   */
  getUntestedLogsByProjectPaginated: (
    projectId: string,
    limit: number = 20,
    offset: number = 0
  ): { logs: DbImplementationLog[]; total: number } => {
    const db = getDatabase();

    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM implementation_log
      WHERE project_id = ? AND tested = 0
    `);
    const countResult = countStmt.get(projectId) as { total: number };

    // Get paginated logs
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE project_id = ? AND tested = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const logs = stmt.all(projectId, limit, offset) as DbImplementationLog[];

    return { logs, total: countResult.total };
  },

  /**
   * Get untested implementation logs for a specific context
   */
  getUntestedLogsByContext: (contextId: string): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE context_id = ? AND tested = 0
      ORDER BY created_at DESC
    `);
    return stmt.all(contextId) as DbImplementationLog[];
  },

  /**
   * Get all implementation logs for a specific context
   */
  getLogsByContext: (contextId: string): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(contextId) as DbImplementationLog[];
  },

  /**
   * Create a new implementation log
   */
  createLog: (log: {
    id: string;
    project_id: string;
    context_id?: string;
    requirement_name: string;
    title: string;
    overview: string;
    overview_bullets?: string;
    tested?: boolean;
    screenshot?: string;
  }): DbImplementationLog => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO implementation_log (id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.project_id,
      log.context_id || null,
      log.requirement_name,
      log.title,
      log.overview,
      log.overview_bullets || null,
      log.tested ? 1 : 0,
      log.screenshot || null,
      now
    );

    // Return the created log
    const selectStmt = db.prepare('SELECT * FROM implementation_log WHERE id = ?');
    return selectStmt.get(log.id) as DbImplementationLog;
  },

  /**
   * Update an implementation log (e.g., mark as tested, update context, add screenshot)
   */
  updateLog: (id: string, updates: {
    tested?: boolean;
    overview?: string;
    overview_bullets?: string | null;
    context_id?: string | null;
    screenshot?: string | null;
  }): DbImplementationLog | null => {
    const db = getDatabase();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.tested !== undefined) {
      updateFields.push('tested = ?');
      values.push(updates.tested ? 1 : 0);
    }
    if (updates.overview !== undefined) {
      updateFields.push('overview = ?');
      values.push(updates.overview);
    }
    if (updates.overview_bullets !== undefined) {
      updateFields.push('overview_bullets = ?');
      values.push(updates.overview_bullets);
    }
    if (updates.screenshot !== undefined) {
      updateFields.push('screenshot = ?');
      values.push(updates.screenshot);
    }
    if (updates.context_id !== undefined) {
      updateFields.push('context_id = ?');
      values.push(updates.context_id);
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
   * Get all untested implementation logs across all projects
   */
  getAllUntestedLogs: (): DbImplementationLog[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM implementation_log
      WHERE tested = 0
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbImplementationLog[];
  },

  /**
   * Count implementation logs for a project within a date range
   */
  countLogsByProjectInRange: (projectId: string, startDate: string, endDate: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM implementation_log
      WHERE project_id = ? AND created_at >= ? AND created_at <= ?
    `);
    const result = stmt.get(projectId, startDate, endDate) as { count: number };
    return result.count;
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
