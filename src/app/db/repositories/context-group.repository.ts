import { getDatabase } from '../connection';
import { DbContextGroup } from '../models/types';
import { createGenericRepository } from './generic.repository';

// Valid layer types for architecture explorer
export type ContextGroupLayerType = 'pages' | 'client' | 'server' | 'external';

const base = createGenericRepository<DbContextGroup>({
  tableName: 'context_groups',
  defaultOrder: 'position ASC',
});

/**
 * Context Group Repository
 * Handles all database operations for context groups
 */
export const contextGroupRepository = {
  /**
   * Get a single context group by ID
   */
  getGroupById: (id: string): DbContextGroup | null => base.getById(id),

  /**
   * Get all context groups for a project
   */
  getGroupsByProject: (projectId: string): DbContextGroup[] => base.getByProject(projectId),

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

    return base.getById(group.id)!;
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
  }): DbContextGroup | null => base.update(id, updates as Record<string, unknown>),

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
  deleteAllByProject: (projectId: string): number => base.deleteByProject(projectId),

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
  getGroupCount: (projectId: string): number => base.countByProject(projectId),

  /**
   * Get all context groups across all projects
   */
  getAllGroups: (): DbContextGroup[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_groups
      ORDER BY project_id, position ASC
    `);
    return stmt.all() as DbContextGroup[];
  },

  /**
   * Get all context groups for multiple projects in a single query
   * Uses SQL IN clause for efficient batching
   */
  getGroupsByProjects: (projectIds: string[]): DbContextGroup[] => base.getByProjects(projectIds)
};
