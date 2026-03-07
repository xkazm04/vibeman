import { getDatabase } from '../connection';
import { DbImplementationLog } from '../models/types';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbImplementationLog>({
  tableName: 'implementation_log',
});

/**
 * Implementation Log Repository
 * Handles all database operations for implementation logs
 */
export const implementationLogRepository = {
  /**
   * Get recent implementation logs for a project (last N logs)
   */
  getRecentLogsByProject: (projectId: string, limit: number = 5): DbImplementationLog[] =>
    base.getByProject(projectId, limit),

  /**
   * Get all implementation logs for a project
   */
  getLogsByProject: (projectId: string): DbImplementationLog[] => base.getByProject(projectId),

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
  getLogById: (logId: string): DbImplementationLog | null => base.getById(logId),

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
    provider?: string;
    model?: string;
  }): DbImplementationLog => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO implementation_log (id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, provider, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      log.provider || null,
      log.model || null,
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
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.tested !== undefined) {
      dbUpdates.tested = updates.tested ? 1 : 0;
    }
    return base.update(id, dbUpdates);
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
    base.deleteById(id);
  }
};
