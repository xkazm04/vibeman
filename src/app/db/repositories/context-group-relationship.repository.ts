import { getDatabase } from '../connection';
import { DbContextGroupRelationship } from '../models/types';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbContextGroupRelationship>({
  tableName: 'context_group_relationships',
  defaultOrder: 'created_at ASC',
});

/**
 * Context Group Relationship Repository
 * Handles database operations for connections between context groups
 */
export const contextGroupRelationshipRepository = {
  /**
   * Get all relationships for a project
   */
  getByProject: (projectId: string): DbContextGroupRelationship[] => base.getByProject(projectId),

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

    // Normalize group IDs for bidirectional uniqueness check:
    // Always store the smaller ID as source to prevent (A,B) and (B,A) duplicates.
    const normalizedSource = relationship.source_group_id < relationship.target_group_id
      ? relationship.source_group_id
      : relationship.target_group_id;
    const normalizedTarget = relationship.source_group_id < relationship.target_group_id
      ? relationship.target_group_id
      : relationship.source_group_id;

    const now = new Date().toISOString();

    // Use INSERT OR IGNORE to prevent TOCTOU race: if a concurrent request
    // already inserted the same pair, this silently succeeds with 0 changes.
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO context_group_relationships (id, project_id, source_group_id, target_group_id, created_at)
      SELECT ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM context_group_relationships
        WHERE (source_group_id = ? AND target_group_id = ?)
           OR (source_group_id = ? AND target_group_id = ?)
      )
    `);

    try {
      const result = stmt.run(
        relationship.id,
        relationship.project_id,
        normalizedSource,
        normalizedTarget,
        now,
        normalizedSource,
        normalizedTarget,
        normalizedTarget,
        normalizedSource,
      );

      if (result.changes === 0) {
        return null; // Relationship already exists
      }

      return base.getById(relationship.id)!;
    } catch {
      return null;
    }
  },

  /**
   * Delete a relationship by ID
   */
  delete: (id: string): boolean => base.deleteById(id),

  /**
   * Delete all relationships for a project
   */
  deleteByProject: (projectId: string): number => base.deleteByProject(projectId),

  /**
   * Get relationship count for a project
   */
  getCount: (projectId: string): number => base.countByProject(projectId)
};
