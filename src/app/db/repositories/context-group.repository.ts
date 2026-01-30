import { getDatabase } from '../connection';
import { DbContextGroup } from '../models/types';

// Valid layer types for architecture explorer
export type ContextGroupLayerType = 'pages' | 'client' | 'server' | 'external';

/**
 * Helper function to get a context group by ID
 */
function getGroupById(id: string): DbContextGroup | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
  return stmt.get(id) as DbContextGroup | null;
}

/**
 * Context Group Repository
 * Handles all database operations for context groups
 */
export const contextGroupRepository = {
  /**
   * Get a single context group by ID
   */
  getGroupById: (id: string): DbContextGroup | null => {
    return getGroupById(id);
  },

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
   * Get context groups by layer type for Architecture Explorer
   */
  getGroupsByType: (projectId: string, type: ContextGroupLayerType): DbContextGroup[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_groups
      WHERE project_id = ? AND type = ?
      ORDER BY name ASC
    `);
    return stmt.all(projectId, type) as DbContextGroup[];
  },

  /**
   * Get all context groups with assigned types (for Architecture Explorer)
   */
  getGroupsWithType: (projectId: string): DbContextGroup[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_groups
      WHERE project_id = ? AND type IS NOT NULL
      ORDER BY name ASC
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
    icon?: string;
    type?: ContextGroupLayerType;
  }): DbContextGroup => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO context_groups (id, project_id, name, color, position, icon, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.project_id,
      group.name,
      group.color,
      group.position,
      group.icon || null,
      group.type || null,
      now,
      now
    );

    // Return the created group
    return getGroupById(group.id)!;
  },

  /**
   * Update a context group
   */
  updateGroup: (id: string, updates: {
    name?: string;
    color?: string;
    position?: number;
    icon?: string | null;
    type?: ContextGroupLayerType | null;
  }): DbContextGroup | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: Array<string | number | null> = [];

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
    if (updates.icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      values.push(updates.type);
    }

    if (updateFields.length === 0) {
      // No updates to make
      return getGroupById(id);
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
    return getGroupById(id);
  },

  /**
   * Delete a context group (will set group_id to NULL for associated contexts)
   */
  deleteGroup: (id: string): boolean => {
    const db = getDatabase();
    // Ungroup associated contexts before deleting the group
    const ungroupStmt = db.prepare('UPDATE contexts SET group_id = NULL, updated_at = ? WHERE group_id = ?');
    ungroupStmt.run(new Date().toISOString(), id);
    const stmt = db.prepare('DELETE FROM context_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all context groups for a project
   * Returns the number of deleted groups
   */
  deleteAllByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_groups WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
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
  },

  /**
   * Get all context groups for multiple projects in a single query
   * Uses SQL IN clause for efficient batching
   */
  getGroupsByProjects: (projectIds: string[]): DbContextGroup[] => {
    if (projectIds.length === 0) return [];

    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM context_groups
      WHERE project_id IN (${placeholders})
      ORDER BY project_id, position ASC
    `);
    return stmt.all(...projectIds) as DbContextGroup[];
  }
};
