import { getDatabase } from '../connection';
import { DbIdea, DbIdeaWithColor, IdeaCategory } from '../models/types';
import { getCurrentTimestamp, selectOne, validateScore } from './repository.utils';
import { createGenericRepository } from './generic.repository';
import { IdeaStateMachine } from '@/lib/ideas/ideaStateMachine';
import { queryIdeas } from './ideaQueryBuilder';

const base = createGenericRepository<DbIdea>({
  tableName: 'ideas',
});

/**
 * Idea Repository
 * Handles all database operations for LLM-generated ideas.
 *
 * Read methods delegate to `queryIdeas()` — a composable query builder that
 * eliminates duplicated SQL across filter/JOIN/pagination variants.
 * Callers can also use `queryIdeas()` directly for ad-hoc compositions.
 */
export const ideaRepository = {
  // ─── Query builder (public) ───────────────────────────────────────────

  /** Composable query builder for ad-hoc idea queries */
  query: queryIdeas,

  // ─── Read helpers (backward-compatible facades) ───────────────────────

  getAllIdeas: (): DbIdea[] =>
    queryIdeas().execute(),

  getIdeasByProject: (projectId: string): DbIdea[] =>
    queryIdeas().project(projectId).execute(),

  getIdeasByProjectInRange: (projectId: string, startDate: string, endDate: string): DbIdea[] =>
    queryIdeas().project(projectId).dateRange(startDate, endDate).execute(),

  getIdeasByProjectAndStatus: (
    projectId: string,
    status: string,
    limit: number,
    after_id: string | null
  ): { ideas: DbIdea[]; nextCursor: string | null } =>
    queryIdeas().project(projectId).status(status).after(after_id).paginate(limit),

  getAllIdeasByStatusPaginated: (
    status: string,
    limit: number,
    after_id: string | null
  ): { ideas: DbIdea[]; nextCursor: string | null } =>
    queryIdeas().status(status).after(after_id).paginate(limit),

  getIdeasByProjectsAndStatus: (
    projectIds: string[],
    status: string,
    limit: number,
    after_id: string | null
  ): { ideas: DbIdea[]; nextCursor: string | null } =>
    queryIdeas().projects(projectIds).status(status).after(after_id).paginate(limit),

  getIdeasByStatus: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): DbIdea[] =>
    queryIdeas().status(status).execute(),

  getIdeasByContext: (contextId: string): DbIdea[] =>
    queryIdeas().context(contextId).execute(),

  countIdeasByProjectInRange: (
    projectId: string,
    startDate: string,
    endDate: string,
    status?: string
  ): number => {
    const q = queryIdeas().project(projectId).dateRange(startDate, endDate);
    if (status) q.status(status);
    return q.count();
  },

  getIdeasByScanId: (scanId: string): DbIdea[] =>
    queryIdeas().scan(scanId).execute(),

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

  getIdeasByGoal: (goalId: string): DbIdea[] =>
    queryIdeas().goal(goalId).execute(),

  getIdeaByRequirementId: (requirementId: string): DbIdea | null => {
    const db = getDatabase();
    return selectOne<DbIdea>(db, 'SELECT * FROM ideas WHERE requirement_id = ?', requirementId);
  },

  getIdeasByRequirementIds: (requirementIds: string[]): Record<string, DbIdea | null> => {
    const db = getDatabase();
    const result: Record<string, DbIdea | null> = {};
    for (const id of requirementIds) {
      result[id] = null;
    }
    if (requirementIds.length === 0) {
      return result;
    }
    const placeholders = requirementIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM ideas WHERE requirement_id IN (${placeholders})`);
    const ideas = stmt.all(...requirementIds) as DbIdea[];
    for (const idea of ideas) {
      if (idea.requirement_id) {
        result[idea.requirement_id] = idea;
      }
    }
    return result;
  },

  getIdeaById: (ideaId: string): DbIdea | null => base.getById(ideaId),

  getIdeasWithNullContext: (): DbIdea[] =>
    queryIdeas().nullContext().execute(),

  getRecentIdeas: (limit: number = 10): DbIdea[] =>
    queryIdeas().limit(limit).execute(),

  // ─── Color JOIN variants ──────────────────────────────────────────────

  getIdeasByStatusWithColors: (status: 'pending' | 'accepted' | 'rejected' | 'implemented'): DbIdeaWithColor[] =>
    queryIdeas().status(status).withColors().execute(),

  getAllIdeasWithColors: (): DbIdeaWithColor[] =>
    queryIdeas().withColors().execute(),

  getIdeasByProjectWithColors: (projectId: string): DbIdeaWithColor[] =>
    queryIdeas().project(projectId).withColors().execute(),

  getIdeasByProjectIds: (projectIds: string[]): DbIdea[] =>
    queryIdeas().projects(projectIds).execute(),

  getIdeasByProjectIdsWithColors: (projectIds: string[]): DbIdeaWithColor[] =>
    queryIdeas().projects(projectIds).withColors().execute(),

  // ─── Write operations ─────────────────────────────────────────────────

  createIdea: (idea: {
    id: string;
    scan_id: string;
    project_id: string;
    context_id?: string | null;
    scan_type: string;
    category: string;
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
    provider?: string | null;
    model?: string | null;
    detailed?: boolean;
  }): DbIdea => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const validatedEffort = validateScore(idea.effort);
    const validatedImpact = validateScore(idea.impact);
    const validatedRisk = validateScore(idea.risk);

    const stmt = db.prepare(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, risk, requirement_id, goal_id,
        provider, model, detailed, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      idea.provider || null,
      idea.model || null,
      idea.detailed ? 1 : 0,
      now,
      now
    );

    return base.getById(idea.id)!;
  },

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

  // ─── Delete operations ────────────────────────────────────────────────

  deleteIdea: (id: string): boolean => base.deleteById(id),

  deleteIdeasByContext: (contextId: string): number =>
    queryIdeas().context(contextId).delete(),

  deleteIdeasWithNullContext: (): number =>
    queryIdeas().nullContext().delete(),

  deleteIdeasByProject: (projectId: string): number => base.deleteByProject(projectId),

  deleteAllIdeas: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ideas');
    const result = stmt.run();
    return result.changes;
  },

  deletePendingIdeasByProject: (projectId: string): number =>
    queryIdeas().project(projectId).status('pending').delete(),

  deleteAllPendingIdeas: (): number =>
    queryIdeas().status('pending').delete(),
};
