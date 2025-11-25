import { getDatabase } from '../connection';
import { DbContext } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

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
   * Get a single context by ID
   */
  getContextById: (contextId: string): DbContext | null => {
    const db = getDatabase();
    return selectOne<DbContext>(db, 'SELECT * FROM contexts WHERE id = ?', contextId);
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
  }): DbContext => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, preview, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  }): DbContext | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.file_paths !== undefined) {
      updateFields.push('file_paths = ?');
      values.push(JSON.stringify(updates.file_paths));
    }
    if (updates.group_id !== undefined) {
      updateFields.push('group_id = ?');
      values.push(updates.group_id);
    }
    if (updates.has_context_file !== undefined) {
      updateFields.push('has_context_file = ?');
      values.push(updates.has_context_file ? 1 : 0);
    }
    if (updates.context_file_path !== undefined) {
      updateFields.push('context_file_path = ?');
      values.push(updates.context_file_path);
    }
    if (updates.preview !== undefined) {
      updateFields.push('preview = ?');
      values.push(updates.preview);
    }
    if (updates.test_scenario !== undefined) {
      updateFields.push('test_scenario = ?');
      values.push(updates.test_scenario);
    }
    if (updates.test_updated !== undefined) {
      updateFields.push('test_updated = ?');
      values.push(updates.test_updated);
    }
    if (updates.target !== undefined) {
      updateFields.push('target = ?');
      values.push(updates.target);
    }
    if (updates.target_fulfillment !== undefined) {
      updateFields.push('target_fulfillment = ?');
      values.push(updates.target_fulfillment);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
      return selectStmt.get(id) as DbContext | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE contexts
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Context not found
    }

    // Return the updated context
    const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
    return selectStmt.get(id) as DbContext;
  },

  /**
   * Delete a context
   */
  deleteContext: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM contexts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

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
  }
};
