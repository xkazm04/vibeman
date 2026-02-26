/**
 * Idea Dependency Repository
 * CRUD operations for idea dependency relationships
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp } from './repository.utils';

export type DependencyRelationship = 'blocks' | 'enables' | 'conflicts_with';

export interface DbIdeaDependency {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: DependencyRelationship;
  created_at: string;
}

export interface IdeaDependencyWithTitle extends DbIdeaDependency {
  source_title: string;
  target_title: string;
  source_status: string;
  target_status: string;
  source_category: string;
  target_category: string;
}

export const ideaDependencyRepository = {
  /**
   * Create a dependency between two ideas
   */
  create(sourceId: string, targetId: string, relationshipType: DependencyRelationship): DbIdeaDependency {
    const db = getDatabase();
    const id = generateId('dep');
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT OR IGNORE INTO idea_dependencies (id, source_id, target_id, relationship_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sourceId, targetId, relationshipType, now);

    return db.prepare('SELECT * FROM idea_dependencies WHERE id = ?').get(id) as DbIdeaDependency;
  },

  /**
   * Get all dependencies where idea is the source (outgoing)
   */
  getBySource(ideaId: string): IdeaDependencyWithTitle[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        src.title as source_title,
        tgt.title as target_title,
        src.status as source_status,
        tgt.status as target_status,
        src.category as source_category,
        tgt.category as target_category
      FROM idea_dependencies d
      JOIN ideas src ON d.source_id = src.id
      JOIN ideas tgt ON d.target_id = tgt.id
      WHERE d.source_id = ?
    `).all(ideaId) as IdeaDependencyWithTitle[];
  },

  /**
   * Get all dependencies where idea is the target (incoming)
   */
  getByTarget(ideaId: string): IdeaDependencyWithTitle[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        src.title as source_title,
        tgt.title as target_title,
        src.status as source_status,
        tgt.status as target_status,
        src.category as source_category,
        tgt.category as target_category
      FROM idea_dependencies d
      JOIN ideas src ON d.source_id = src.id
      JOIN ideas tgt ON d.target_id = tgt.id
      WHERE d.target_id = ?
    `).all(ideaId) as IdeaDependencyWithTitle[];
  },

  /**
   * Get all dependencies for an idea (both directions)
   */
  getAllForIdea(ideaId: string): IdeaDependencyWithTitle[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        src.title as source_title,
        tgt.title as target_title,
        src.status as source_status,
        tgt.status as target_status,
        src.category as source_category,
        tgt.category as target_category
      FROM idea_dependencies d
      JOIN ideas src ON d.source_id = src.id
      JOIN ideas tgt ON d.target_id = tgt.id
      WHERE d.source_id = ? OR d.target_id = ?
    `).all(ideaId, ideaId) as IdeaDependencyWithTitle[];
  },

  /**
   * Get dependency counts for multiple ideas (for batch display)
   */
  getDependencyCounts(ideaIds: string[]): Record<string, number> {
    if (ideaIds.length === 0) return {};
    const db = getDatabase();
    const placeholders = ideaIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT idea_id, COUNT(*) as count FROM (
        SELECT source_id as idea_id FROM idea_dependencies WHERE source_id IN (${placeholders})
        UNION ALL
        SELECT target_id as idea_id FROM idea_dependencies WHERE target_id IN (${placeholders})
      ) GROUP BY idea_id
    `).all(...ideaIds, ...ideaIds) as { idea_id: string; count: number }[];

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.idea_id] = row.count;
    }
    return counts;
  },

  /**
   * Get prerequisite ideas (ideas that block this one)
   */
  getPrerequisites(ideaId: string): IdeaDependencyWithTitle[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        src.title as source_title,
        tgt.title as target_title,
        src.status as source_status,
        tgt.status as target_status,
        src.category as source_category,
        tgt.category as target_category
      FROM idea_dependencies d
      JOIN ideas src ON d.source_id = src.id
      JOIN ideas tgt ON d.target_id = tgt.id
      WHERE d.target_id = ? AND d.relationship_type = 'blocks'
    `).all(ideaId) as IdeaDependencyWithTitle[];
  },

  /**
   * Get ideas unlocked by accepting this idea (ideas that this one enables)
   */
  getUnlockedByAccepting(ideaId: string): IdeaDependencyWithTitle[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        src.title as source_title,
        tgt.title as target_title,
        src.status as source_status,
        tgt.status as target_status,
        src.category as source_category,
        tgt.category as target_category
      FROM idea_dependencies d
      JOIN ideas src ON d.source_id = src.id
      JOIN ideas tgt ON d.target_id = tgt.id
      WHERE d.source_id = ? AND d.relationship_type = 'enables'
    `).all(ideaId) as IdeaDependencyWithTitle[];
  },

  /**
   * Delete a specific dependency
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM idea_dependencies WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Delete all dependencies for an idea (both directions)
   */
  deleteAllForIdea(ideaId: string): number {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM idea_dependencies WHERE source_id = ? OR target_id = ?'
    ).run(ideaId, ideaId);
    return result.changes;
  },

  /**
   * Auto-discover related ideas based on same context and overlapping categories
   */
  discoverRelated(ideaId: string, limit: number = 10): Array<{ id: string; title: string; category: string; status: string; context_id: string | null }> {
    const db = getDatabase();
    // Find ideas in the same context or with the same category, excluding self
    return db.prepare(`
      SELECT DISTINCT i2.id, i2.title, i2.category, i2.status, i2.context_id
      FROM ideas i1
      JOIN ideas i2 ON i2.id != i1.id
        AND i2.project_id = i1.project_id
        AND (i2.context_id = i1.context_id OR i2.category = i1.category)
      WHERE i1.id = ?
      ORDER BY
        CASE WHEN i2.context_id = i1.context_id AND i2.category = i1.category THEN 0
             WHEN i2.context_id = i1.context_id THEN 1
             ELSE 2 END,
        i2.created_at DESC
      LIMIT ?
    `).all(ideaId, limit) as Array<{ id: string; title: string; category: string; status: string; context_id: string | null }>;
  },
};
