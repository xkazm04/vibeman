import { getDatabase } from '../connection';
import { DbContextGroupRelationship } from '../models/types';

/**
 * Context Group Relationship Repository
 * Handles database operations for connections between context groups
 */
export const contextGroupRelationshipRepository = {
  /**
   * Get all relationships for a project
   */
  getByProject: (projectId: string): DbContextGroupRelationship[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_group_relationships
      WHERE project_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(projectId) as DbContextGroupRelationship[];
  },

  /**
   * Get relationships for a specific context group (as source or target)
   */
  getByGroupId: (groupId: string): DbContextGroupRelationship[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_group_relationships
      WHERE source_group_id = ? OR target_group_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(groupId, groupId) as DbContextGroupRelationship[];
  },

  /**
   * Check if a relationship exists between two groups (in either direction)
   */
  exists: (sourceGroupId: string, targetGroupId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM context_group_relationships
      WHERE (source_group_id = ? AND target_group_id = ?)
         OR (source_group_id = ? AND target_group_id = ?)
    `);
    const result = stmt.get(sourceGroupId, targetGroupId, targetGroupId, sourceGroupId) as { count: number };
    return result.count > 0;
  },

  /**
   * Create a new relationship between two context groups
   */
  create: (relationship: {
    id: string;
    project_id: string;
    source_group_id: string;
    target_group_id: string;
  }): DbContextGroupRelationship | null => {
    const db = getDatabase();

    // Prevent self-referencing relationships
    if (relationship.source_group_id === relationship.target_group_id) {
      return null;
    }

    // Check if relationship already exists
    if (contextGroupRelationshipRepository.exists(
      relationship.source_group_id,
      relationship.target_group_id
    )) {
      return null;
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO context_group_relationships (id, project_id, source_group_id, target_group_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        relationship.id,
        relationship.project_id,
        relationship.source_group_id,
        relationship.target_group_id,
        now
      );

      // Return the created relationship
      const getStmt = db.prepare('SELECT * FROM context_group_relationships WHERE id = ?');
      return getStmt.get(relationship.id) as DbContextGroupRelationship;
    } catch {
      return null;
    }
  },

  /**
   * Delete a relationship by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_group_relationships WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all relationships for a project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_group_relationships WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get relationship count for a project
   */
  getCount: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM context_group_relationships
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number };
    return result.count;
  }
};
