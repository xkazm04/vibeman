import { getDatabase } from '../connection';
import { DbIdea, IdeaCategory } from '../models/types';

/**
 * Idea Repository
 * Handles all database operations for LLM-generated ideas
 */
export const ideaRepository = {
  /**
   * Get all ideas across all projects
   */
  getAllIdeas: (): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbIdea[];
  },

  /**
   * Get ideas by project
   */
  getIdeasByProject: (projectId: string): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbIdea[];
  },

  /**
   * Get ideas by status
   */
  getIdeasByStatus: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE status = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(status) as DbIdea[];
  },

  /**
   * Get ideas by context
   */
  getIdeasByContext: (contextId: string): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(contextId) as DbIdea[];
  },

  /**
   * Get a single idea by ID
   */
  getIdeaById: (ideaId: string): DbIdea | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
    const idea = stmt.get(ideaId) as DbIdea | undefined;
    return idea || null;
  },

  /**
   * Create a new idea
   * @param idea.category - Accepts any string, but IdeaCategory provides standard guideline values
   */
  createIdea: (idea: {
    id: string;
    scan_id: string;
    project_id: string;
    context_id?: string | null;
    scan_type: string;
    category: string; // Accepts any string, IdeaCategory enum provides guidelines
    title: string;
    description?: string;
    reasoning?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'implemented';
    user_feedback?: string;
    user_pattern?: boolean;
    effort?: number | null;
    impact?: number | null;
  }): DbIdea => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      idea.id,
      idea.scan_id,
      idea.project_id,
      idea.context_id || null,
      idea.scan_type,
      idea.category,
      idea.title,
      idea.description || null,
      idea.reasoning || null,
      idea.status || 'pending',
      idea.user_feedback || null,
      idea.user_pattern ? 1 : 0,
      idea.effort || null,
      idea.impact || null,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
    return selectStmt.get(idea.id) as DbIdea;
  },

  /**
   * Update an idea
   */
  updateIdea: (id: string, updates: {
    status?: 'pending' | 'accepted' | 'rejected' | 'implemented';
    user_feedback?: string;
    user_pattern?: boolean;
    title?: string;
    description?: string;
    reasoning?: string;
    effort?: number | null;
    impact?: number | null;
  }): DbIdea | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.user_feedback !== undefined) {
      updateFields.push('user_feedback = ?');
      values.push(updates.user_feedback || null);
    }
    if (updates.user_pattern !== undefined) {
      updateFields.push('user_pattern = ?');
      values.push(updates.user_pattern ? 1 : 0);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.reasoning !== undefined) {
      updateFields.push('reasoning = ?');
      values.push(updates.reasoning || null);
    }
    if (updates.effort !== undefined) {
      updateFields.push('effort = ?');
      values.push(updates.effort);
    }
    if (updates.impact !== undefined) {
      updateFields.push('impact = ?');
      values.push(updates.impact);
    }

    if (updateFields.length === 0) {
      const selectStmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
      return selectStmt.get(id) as DbIdea | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE ideas
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
    return selectStmt.get(id) as DbIdea;
  },

  /**
   * Delete an idea
   */
  deleteIdea: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get recent ideas (last N)
   */
  getRecentIdeas: (limit: number = 10): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DbIdea[];
  },

  /**
   * Delete all ideas from the database
   * WARNING: This is destructive and cannot be undone
   */
  deleteAllIdeas: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas');
    const result = stmt.run();
    return result.changes;
  }
};
