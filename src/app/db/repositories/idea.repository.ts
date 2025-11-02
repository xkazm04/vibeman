import { getDatabase } from '../connection';
import { DbIdea, IdeaCategory } from '../models/types';
import { LRUCache, generateCacheKey } from '@/lib/lru-cache';

/**
 * LRU cache instance for idea queries
 * Caches up to 200 query results to reduce SQLite access
 */
const ideaCache = new LRUCache<any>({ maxSize: 200 });

/**
 * Invalidate all idea cache entries
 * Called on any write operation (create, update, delete)
 */
const invalidateIdeaCache = () => {
  ideaCache.clear();
};

/**
 * Idea Repository
 * Handles all database operations for LLM-generated ideas
 */
export const ideaRepository = {
  /**
   * Get all ideas across all projects
   */
  getAllIdeas: (): DbIdea[] => {
    const cacheKey = generateCacheKey('getAllIdeas');
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      ORDER BY created_at DESC
    `);
    const result = stmt.all() as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by project
   */
  getIdeasByProject: (projectId: string): DbIdea[] => {
    const cacheKey = generateCacheKey('getIdeasByProject', projectId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const result = stmt.all(projectId) as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by status
   */
  getIdeasByStatus: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): DbIdea[] => {
    const cacheKey = generateCacheKey('getIdeasByStatus', status);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE status = ?
      ORDER BY created_at DESC
    `);
    const result = stmt.all(status) as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by context
   */
  getIdeasByContext: (contextId: string): DbIdea[] => {
    const cacheKey = generateCacheKey('getIdeasByContext', contextId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    const result = stmt.all(contextId) as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by goal
   */
  getIdeasByGoal: (goalId: string): DbIdea[] => {
    const cacheKey = generateCacheKey('getIdeasByGoal', goalId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE goal_id = ?
      ORDER BY created_at DESC
    `);
    const result = stmt.all(goalId) as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get idea by requirement_id
   */
  getIdeaByRequirementId: (requirementId: string): DbIdea | null => {
    const cacheKey = generateCacheKey('getIdeaByRequirementId', requirementId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM ideas WHERE requirement_id = ?');
    const idea = stmt.get(requirementId) as DbIdea | undefined;
    const result = idea || null;
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get a single idea by ID
   */
  getIdeaById: (ideaId: string): DbIdea | null => {
    const cacheKey = generateCacheKey('getIdeaById', ideaId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
    const idea = stmt.get(ideaId) as DbIdea | undefined;
    const result = idea || null;
    ideaCache.set(cacheKey, result);
    return result;
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
    requirement_id?: string | null;
    goal_id?: string | null;
  }): DbIdea => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Validate effort and impact values
    const validatedEffort = ideaRepository.validateEffortImpact(idea.effort);
    const validatedImpact = ideaRepository.validateEffortImpact(idea.impact);

    const stmt = db.prepare(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, requirement_id, goal_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      idea.requirement_id || null,
      idea.goal_id || null,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM ideas WHERE id = ?');
    const result = selectStmt.get(idea.id) as DbIdea;

    // Invalidate cache on write operation
    invalidateIdeaCache();

    return result;
  },

  /**
   * Validate effort/impact value (must be 1-3 or null)
   */
  validateEffortImpact: (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (isNaN(num) || num < 1 || num > 3) {
      console.warn(`[ideaRepository] Invalid effort/impact value: ${value}, defaulting to 1`);
      return 1; // Default to 1 if invalid
    }
    return num;
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
    requirement_id?: string | null;
    goal_id?: string | null;
  }): DbIdea | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: any[] = [];

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
      values.push(ideaRepository.validateEffortImpact(updates.effort));
    }
    if (updates.impact !== undefined) {
      updateFields.push('impact = ?');
      values.push(ideaRepository.validateEffortImpact(updates.impact));
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

    // Invalidate cache on write operation
    invalidateIdeaCache();

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

    // Invalidate cache on write operation
    if (result.changes > 0) {
      invalidateIdeaCache();
    }

    return result.changes > 0;
  },

  /**
   * Delete all ideas associated with a context
   */
  deleteIdeasByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas WHERE context_id = ?');
    const result = stmt.run(contextId);

    // Invalidate cache on write operation
    if (result.changes > 0) {
      invalidateIdeaCache();
    }

    return result.changes;
  },

  /**
   * Get recent ideas (last N)
   */
  getRecentIdeas: (limit: number = 10): DbIdea[] => {
    const cacheKey = generateCacheKey('getRecentIdeas', limit);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const result = stmt.all(limit) as DbIdea[];
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by status with context colors (optimized JOIN query)
   * Returns ideas with their associated context group colors in a single query
   */
  getIdeasByStatusWithColors: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): Array<DbIdea & { context_color?: string | null }> => {
    const cacheKey = generateCacheKey('getIdeasByStatusWithColors', status);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

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
    const result = stmt.all(status) as Array<DbIdea & { context_color?: string | null }>;
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get all ideas with context colors (optimized JOIN query)
   * Returns all ideas with their associated context group colors in a single query
   */
  getAllIdeasWithColors: (): Array<DbIdea & { context_color?: string | null }> => {
    const cacheKey = generateCacheKey('getAllIdeasWithColors');
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

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
    const result = stmt.all() as Array<DbIdea & { context_color?: string | null }>;
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get ideas by project with context colors (optimized JOIN query)
   */
  getIdeasByProjectWithColors: (projectId: string): Array<DbIdea & { context_color?: string | null }> => {
    const cacheKey = generateCacheKey('getIdeasByProjectWithColors', projectId);
    const cached = ideaCache.get(cacheKey);
    if (cached !== undefined) return cached;

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
    const result = stmt.all(projectId) as Array<DbIdea & { context_color?: string | null }>;
    ideaCache.set(cacheKey, result);
    return result;
  },

  /**
   * Delete all ideas from the database
   * WARNING: This is destructive and cannot be undone
   */
  deleteAllIdeas: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas');
    const result = stmt.run();

    // Invalidate cache on write operation
    if (result.changes > 0) {
      invalidateIdeaCache();
    }

    return result.changes;
  }
};
