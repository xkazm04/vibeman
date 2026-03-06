import { getDatabase } from '../connection';
import { DbIdea, IdeaCategory } from '../models/types';
import { getCurrentTimestamp, selectOne, validateScore } from './repository.utils';
import { createGenericRepository } from './generic.repository';
import { IdeaStateMachine } from '@/lib/ideas/ideaStateMachine';

const base = createGenericRepository<DbIdea>({
  tableName: 'ideas',
});

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
  getIdeasByProject: (projectId: string): DbIdea[] => base.getByProject(projectId),

  /**
   * Get ideas for a project within a date range (SQL-level filtering)
   */
  getIdeasByProjectInRange: (projectId: string, startDate: string, endDate: string): DbIdea[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id = ? AND created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, startDate, endDate) as DbIdea[];
  },

  /**
   * Get ideas by project and status with SQL-level pagination
   */
  getIdeasByProjectAndStatus: (
    projectId: string,
    status: string,
    limit: number,
    offset: number
  ): { ideas: DbIdea[]; total: number } => {
    const db = getDatabase();
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM ideas
      WHERE project_id = ? AND status = ?
    `);
    const total = (countStmt.get(projectId, status) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const ideas = stmt.all(projectId, status, limit, offset) as DbIdea[];

    return { ideas, total };
  },

  /**
   * Get all ideas by status with SQL-level pagination (cross-project)
   */
  getAllIdeasByStatusPaginated: (
    status: string,
    limit: number,
    offset: number
  ): { ideas: DbIdea[]; total: number } => {
    const db = getDatabase();
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM ideas
      WHERE status = ?
    `);
    const total = (countStmt.get(status) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const ideas = stmt.all(status, limit, offset) as DbIdea[];

    return { ideas, total };
  },

  /**
   * Get ideas by multiple project IDs and status with SQL-level pagination
   */
  getIdeasByProjectsAndStatus: (
    projectIds: string[],
    status: string,
    limit: number,
    offset: number
  ): { ideas: DbIdea[]; total: number } => {
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(',');

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM ideas
      WHERE project_id IN (${placeholders}) AND status = ?
    `);
    const total = (countStmt.get(...projectIds, status) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id IN (${placeholders}) AND status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const ideas = stmt.all(...projectIds, status, limit, offset) as DbIdea[];

    return { ideas, total };
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
   * Count ideas by project, date range, and optional status (SQL-filtered)
   */
  countIdeasByProjectInRange: (
    projectId: string,
    startDate: string,
    endDate: string,
    status?: string
  ): number => {
    const db = getDatabase();
    if (status) {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM ideas
        WHERE project_id = ? AND created_at >= ? AND created_at <= ? AND status = ?
      `);
      const result = stmt.get(projectId, startDate, endDate, status) as { count: number };
      return result.count;
    }
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM ideas
      WHERE project_id = ? AND created_at >= ? AND created_at <= ?
    `);
    const result = stmt.get(projectId, startDate, endDate) as { count: number };
    return result.count;
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
   * Get the latest scan ID for a project and scan type
   * Returns the most recent scan_id or null if none found
   */
  getLatestScanId: (projectId: string, scanType: string): string | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT scan_id FROM ideas
      WHERE project_id = ? AND scan_type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const result = stmt.get(projectId, scanType) as { scan_id: string } | undefined;
    return result?.scan_id ?? null;
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
  getIdeaById: (ideaId: string): DbIdea | null => base.getById(ideaId),

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
    const validatedEffort = validateScore(idea.effort);
    const validatedImpact = validateScore(idea.impact);
    const validatedRisk = validateScore(idea.risk);

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

    return base.getById(idea.id)!;
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
    // Transform fields that need special handling
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.user_pattern !== undefined) {
      dbUpdates.user_pattern = updates.user_pattern ? 1 : 0;
    }
    if (updates.effort !== undefined) {
      dbUpdates.effort = validateScore(updates.effort);
    }
    if (updates.impact !== undefined) {
      dbUpdates.impact = validateScore(updates.impact);
    }
    if (updates.risk !== undefined) {
      dbUpdates.risk = validateScore(updates.risk);
    }
    // Validate status transition and apply side-effects via state machine
    if (updates.status) {
      const current = base.getById(id);
      if (current) {
        const transition = IdeaStateMachine.authorize(current.status, updates.status);
        if (!transition.allowed) {
          throw new Error(transition.reason);
        }
        Object.assign(dbUpdates, transition.sideEffects);
      }
    }
    return base.update(id, dbUpdates);
  },

  /**
   * Delete an idea
   */
  deleteIdea: (id: string): boolean => base.deleteById(id),

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
  deleteIdeasByProject: (projectId: string): number => base.deleteByProject(projectId),

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
   * Get ideas by multiple project IDs using SQL IN clause
   */
  getIdeasByProjectIds: (projectIds: string[]): DbIdea[] => {
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT * FROM ideas
      WHERE project_id IN (${placeholders})
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds) as DbIdea[];
  },

  /**
   * Get ideas by multiple project IDs with context colors using SQL IN clause
   */
  getIdeasByProjectIdsWithColors: (projectIds: string[]): Array<DbIdea & { context_color?: string | null }> => {
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT
        ideas.*,
        context_groups.color as context_color
      FROM ideas
      LEFT JOIN contexts ON ideas.context_id = contexts.id
      LEFT JOIN context_groups ON contexts.group_id = context_groups.id
      WHERE ideas.project_id IN (${placeholders})
      ORDER BY ideas.created_at DESC
    `);
    return stmt.all(...projectIds) as Array<DbIdea & { context_color?: string | null }>;
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
