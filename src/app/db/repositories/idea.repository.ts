import { getDatabase } from '../connection';
import { DbIdea, IdeaCategory } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

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
   * Get ideas by scan ID
   * More efficient than fetching all project ideas and filtering in memory
   */
  getIdeasByScanId: (scanId: string): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE scan_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(scanId) as DbIdea[];
  },

  /**
   * Get ideas by goal
   */
  getIdeasByGoal: (goalId: string): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE goal_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(goalId) as DbIdea[];
  },

  /**
   * Get idea by requirement_id
   */
  getIdeaByRequirementId: (requirementId: string): DbIdea | null => {
    const db = getDatabase();
    return selectOne<DbIdea>(db, 'SELECT * FROM ideas WHERE requirement_id = ?', requirementId);
  },

  /**
   * Get ideas by multiple requirement_ids in a single query (batch)
   * Returns a map of requirementId -> idea (or null if not found)
   */
  getIdeasByRequirementIds: (requirementIds: string[]): Record<string, DbIdea | null> => {
    const db = getDatabase();
    const result: Record<string, DbIdea | null> = {};

    // Initialize all as null
    for (const id of requirementIds) {
      result[id] = null;
    }

    if (requirementIds.length === 0) {
      return result;
    }

    // Use parameterized query with IN clause
    const placeholders = requirementIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM ideas WHERE requirement_id IN (${placeholders})`);
    const ideas = stmt.all(...requirementIds) as DbIdea[];

    // Map results by requirement_id
    for (const idea of ideas) {
      if (idea.requirement_id) {
        result[idea.requirement_id] = idea;
      }
    }

    return result;
  },

  /**
   * Get a single idea by ID
   */
  getIdeaById: (ideaId: string): DbIdea | null => {
    const db = getDatabase();
    return selectOne<DbIdea>(db, 'SELECT * FROM ideas WHERE id = ?', ideaId);
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
    risk?: number | null;
    requirement_id?: string | null;
    goal_id?: string | null;
  }): DbIdea => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Validate effort, impact, and risk values (1-10 scale)
    const validatedEffort = ideaRepository.validateScore(idea.effort);
    const validatedImpact = ideaRepository.validateScore(idea.impact);
    const validatedRisk = ideaRepository.validateScore(idea.risk);

    const stmt = db.prepare(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, risk, requirement_id, goal_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      validatedEffort,
      validatedImpact,
      validatedRisk,
      idea.requirement_id || null,
      idea.goal_id || null,
      now,
      now
    );

    return selectOne<DbIdea>(db, 'SELECT * FROM ideas WHERE id = ?', idea.id)!;
  },

  /**
   * Validate score value (must be 1-10 or null)
   * Used for effort, impact, and risk scoring
   */
  validateScore: (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (isNaN(num) || num < 1 || num > 10) {
      return null; // Return null if invalid instead of defaulting
    }
    return num;
  },

  /**
   * @deprecated Use validateScore instead - kept for backwards compatibility
   * Validate effort/impact value (must be 1-10 or null)
   */
  validateEffortImpact: (value: number | null | undefined): number | null => {
    return ideaRepository.validateScore(value);
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
    risk?: number | null;
    requirement_id?: string | null;
    goal_id?: string | null;
  }): DbIdea | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
      // Update implemented_at when status changes to 'implemented'
      if (updates.status === 'implemented') {
        updateFields.push('implemented_at = ?');
        values.push(now);
      }
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
      values.push(ideaRepository.validateScore(updates.effort));
    }
    if (updates.impact !== undefined) {
      updateFields.push('impact = ?');
      values.push(ideaRepository.validateScore(updates.impact));
    }
    if (updates.risk !== undefined) {
      updateFields.push('risk = ?');
      values.push(ideaRepository.validateScore(updates.risk));
    }
    if (updates.requirement_id !== undefined) {
      updateFields.push('requirement_id = ?');
      values.push(updates.requirement_id || null);
    }
    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id || null);
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
   * Delete all ideas associated with a context
   */
  deleteIdeasByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE context_id = ?');
    const result = stmt.run(contextId);
    return result.changes;
  },

  /**
   * Get ideas with null context_id (General ideas)
   */
  getIdeasWithNullContext: (): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE context_id IS NULL
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbIdea[];
  },

  /**
   * Delete all ideas with null context_id (General ideas)
   */
  deleteIdeasWithNullContext: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE context_id IS NULL');
    const result = stmt.run();
    return result.changes;
  },

  /**
   * Delete all ideas for a specific project
   */
  deleteIdeasByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
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
   * Get ideas by status with context colors (optimized JOIN query)
   * Returns ideas with their associated context group colors in a single query
   */
  getIdeasByStatusWithColors: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): Array<DbIdea & { context_color?: string | null }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        ideas.*,
        context_groups.color as context_color
      FROM ideas
      LEFT JOIN contexts ON ideas.context_id = contexts.id
      LEFT JOIN context_groups ON contexts.group_id = context_groups.id
      WHERE ideas.status = ?
      ORDER BY ideas.created_at DESC
    `);
    return stmt.all(status) as Array<DbIdea & { context_color?: string | null }>;
  },

  /**
   * Get all ideas with context colors (optimized JOIN query)
   * Returns all ideas with their associated context group colors in a single query
   */
  getAllIdeasWithColors: (): Array<DbIdea & { context_color?: string | null }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        ideas.*,
        context_groups.color as context_color
      FROM ideas
      LEFT JOIN contexts ON ideas.context_id = contexts.id
      LEFT JOIN context_groups ON contexts.group_id = context_groups.id
      ORDER BY ideas.created_at DESC
    `);
    return stmt.all() as Array<DbIdea & { context_color?: string | null }>;
  },

  /**
   * Get ideas by project with context colors (optimized JOIN query)
   */
  getIdeasByProjectWithColors: (projectId: string): Array<DbIdea & { context_color?: string | null }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        ideas.*,
        context_groups.color as context_color
      FROM ideas
      LEFT JOIN contexts ON ideas.context_id = contexts.id
      LEFT JOIN context_groups ON contexts.group_id = context_groups.id
      WHERE ideas.project_id = ?
      ORDER BY ideas.created_at DESC
    `);
    return stmt.all(projectId) as Array<DbIdea & { context_color?: string | null }>;
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
  },

  /**
   * Delete all pending ideas for a project (for Tinder flush)
   */
  deletePendingIdeasByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE project_id = ? AND status = ?');
    const result = stmt.run(projectId, 'pending');
    return result.changes;
  },

  /**
   * Delete all pending ideas across all projects (for Tinder flush all)
   */
  deleteAllPendingIdeas: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE status = ?');
    const result = stmt.run('pending');
    return result.changes;
  }
};
