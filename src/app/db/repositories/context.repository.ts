import { getDatabase } from '../connection';
import { DbContext } from '../models/types';
import { getCurrentTimestamp, selectOne } from './repository.utils';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbContext>({
  tableName: 'contexts',
});

/**
 * Context Repository
 * Handles all database operations for contexts
 */
export const contextRepository = {
  /**
   * Get all contexts for a project (including those without groups)
   */
  getContextsByProject: (projectId: string): DbContext[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.project_id = ?
      ORDER BY COALESCE(cg.position, 999) ASC, c.created_at DESC
    `);
    return stmt.all(projectId) as DbContext[];
  },

  /**
   * Get contexts by group
   */
  getContextsByGroup: (groupId: string): DbContext[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM contexts
      WHERE group_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(groupId) as DbContext[];
  },

  /**
   * Get a single context by ID (with group info)
   */
  getContextById: (contextId: string): DbContext | null => {
    const db = getDatabase();
    return selectOne<DbContext>(db, `
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.id = ?
    `, contextId);
  },

  /**
   * Find a context by name and project ID (case-insensitive)
   */
  getContextByName: (name: string, projectId: string): DbContext | null => {
    const db = getDatabase();
    return selectOne<DbContext>(db, `
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.project_id = ? AND LOWER(c.name) = LOWER(?)
    `, projectId, name);
  },

  /**
   * Create a new context
   */
  createContext: (context: {
    id: string;
    project_id: string;
    group_id?: string | null;
    name: string;
    description?: string;
    file_paths: string[];
    has_context_file?: boolean;
    context_file_path?: string;
    preview?: string | null;
    test_scenario?: string;
    entry_points?: string;
    db_tables?: string;
    keywords?: string;
    api_surface?: string;
    cross_refs?: string;
    tech_stack?: string;
  }): DbContext => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, preview, test_scenario, entry_points, db_tables, keywords, api_surface, cross_refs, tech_stack, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      context.id,
      context.project_id,
      context.group_id || null,
      context.name,
      context.description || null,
      JSON.stringify(context.file_paths),
      context.has_context_file ? 1 : 0,
      context.context_file_path || null,
      context.preview || null,
      context.test_scenario || null,
      context.entry_points || null,
      context.db_tables || null,
      context.keywords || null,
      context.api_surface || null,
      context.cross_refs || null,
      context.tech_stack || null,
      now,
      now
    );

    return selectOne<DbContext>(db, 'SELECT * FROM contexts WHERE id = ?', context.id)!;
  },

  /**
   * Create context from generated file
   */
  createContextFromFile: (context: {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    file_paths: string[];
    context_file_path: string;
  }): DbContext => {
    return contextRepository.createContext({
      ...context,
      has_context_file: true,
      context_file_path: context.context_file_path
    });
  },

  /**
   * Find context by file path
   */
  findContextByFilePath: (projectId: string, contextFilePath: string): DbContext | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM contexts
      WHERE project_id = ? AND context_file_path = ?
    `);
    return stmt.get(projectId, contextFilePath) as DbContext | null;
  },

  /**
   * Update a context
   */
  updateContext: (id: string, updates: {
    name?: string;
    description?: string;
    file_paths?: string[];
    group_id?: string | null;
    has_context_file?: boolean;
    context_file_path?: string;
    preview?: string | null;
    test_scenario?: string | null;
    test_updated?: string | null;
    target?: string | null;
    target_fulfillment?: string | null;
    target_rating?: number | null;
    entry_points?: string | null;
    db_tables?: string | null;
    keywords?: string | null;
    api_surface?: string | null;
    cross_refs?: string | null;
    tech_stack?: string | null;
  }): DbContext | null => {
    // Transform fields that need special handling before delegating to base.update
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.file_paths !== undefined) {
      dbUpdates.file_paths = JSON.stringify(updates.file_paths);
    }
    if (updates.has_context_file !== undefined) {
      dbUpdates.has_context_file = updates.has_context_file ? 1 : 0;
    }
    return base.update(id, dbUpdates);
  },

  /**
   * Delete a context
   */
  deleteContext: (id: string): boolean => base.deleteById(id),

  /**
   * Move context to different group
   */
  moveContextToGroup: (contextId: string, newGroupId: string | null): DbContext | null => {
    return contextRepository.updateContext(contextId, { group_id: newGroupId });
  },

  /**
   * Get context count for a group
   */
  getContextCountByGroup: (groupId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM contexts
      WHERE group_id = ?
    `);
    const result = stmt.get(groupId) as { count: number };
    return result.count;
  },

  /**
   * Increment the implemented_tasks counter for a context
   */
  incrementImplementedTasks: (contextId: string): DbContext | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE contexts
      SET implemented_tasks = COALESCE(implemented_tasks, 0) + 1,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, contextId);

    if (result.changes === 0) {
      return null; // Context not found
    }

    // Return the updated context
    const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
    return selectStmt.get(contextId) as DbContext;
  },

  /**
   * Delete all contexts for a project
   */
  deleteAllContextsByProject: (projectId: string): number => base.deleteByProject(projectId),

  /**
   * Batch move contexts to new groups in 2 queries (1 UPDATE + 1 SELECT)
   * instead of 2N queries (N UPDATEs + N SELECTs)
   */
  batchMoveContexts: (moves: Array<{ contextId: string; newGroupId: string | null }>): DbContext[] => {
    if (moves.length === 0) return [];

    const db = getDatabase();
    const now = new Date().toISOString();
    const ids = moves.map(m => m.contextId);

    // Build CASE/WHEN for group_id assignments
    const caseParts: string[] = [];
    const caseValues: (string | null)[] = [];
    for (const move of moves) {
      caseParts.push('WHEN id = ? THEN ?');
      caseValues.push(move.contextId, move.newGroupId);
    }

    const placeholders = ids.map(() => '?').join(', ');

    // Single UPDATE with CASE/WHEN
    db.prepare(`
      UPDATE contexts
      SET group_id = CASE ${caseParts.join(' ')} END,
          updated_at = ?
      WHERE id IN (${placeholders})
    `).run(...caseValues, now, ...ids);

    // Single SELECT to fetch all updated rows
    return db.prepare(`
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.id IN (${placeholders})
    `).all(...ids) as DbContext[];
  },

  /**
   * Get all contexts across all projects
   */
  getAllContexts: (): DbContext[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      ORDER BY c.created_at DESC
    `);
    return stmt.all() as DbContext[];
  },

  /**
   * Get all contexts for multiple projects in a single query
   * Uses SQL IN clause for efficient batching
   */
  getContextsByProjects: (projectIds: string[]): DbContext[] => {
    if (projectIds.length === 0) return [];

    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.project_id IN (${placeholders})
      ORDER BY c.project_id, COALESCE(cg.position, 999) ASC, c.created_at DESC
    `);
    return stmt.all(...projectIds) as DbContext[];
  }
};
