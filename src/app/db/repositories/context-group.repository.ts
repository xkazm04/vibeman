import { getDatabase } from '../connection';
import { DbContextGroup } from '../models/types';

/**
 * Context Group Repository
 * Handles all database operations for context groups
 */
export const contextGroupRepository = {
  /**
   * Get all context groups for a project
   */
  getGroupsByProject: (projectId: string): DbContextGroup[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_groups
      WHERE project_id = ?
      ORDER BY position ASC
    `);
    return stmt.all(projectId) as DbContextGroup[];
  },

  /**
   * Create a new context group
   */
  createGroup: (group: {
    id: string;
    project_id: string;
    name: string;
    color: string;
    position: number;
  }): DbContextGroup => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO context_groups (id, project_id, name, color, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.project_id,
      group.name,
      group.color,
      group.position,
      now,
      now
    );

    // Return the created group
    const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
    return selectStmt.get(group.id) as DbContextGroup;
  },

  /**
   * Update a context group
   */
  updateGroup: (id: string, updates: {
    name?: string;
    color?: string;
    position?: number;
  }): DbContextGroup | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.position !== undefined) {
      updateFields.push('position = ?');
      values.push(updates.position);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
      return selectStmt.get(id) as DbContextGroup | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE context_groups
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Group not found
    }

    // Return the updated group
    const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
    return selectStmt.get(id) as DbContextGroup;
  },

  /**
   * Delete a context group (will set group_id to NULL for associated contexts)
   */
  deleteGroup: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get the maximum position for a project
   */
  getMaxPosition: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(position) as max_position
      FROM context_groups
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { max_position: number | null };
    return result.max_position || 0;
  },

  /**
   * Get group count for a project
   */
  getGroupCount: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM context_groups
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number };
    return result.count;
  }
};
