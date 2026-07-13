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
 * Sentinel written to `user_feedback` when a pending idea is auto-archived for
 * staleness. Lets the archival be identified (and undone) later, and keeps it
 * distinct from a user's explicit rejection.
 */
export const STALE_ARCHIVE_FEEDBACK = '[auto-archived: stale — no activity]';

/** Default age (days) after which an untouched pending idea is auto-archived. */
export const DEFAULT_STALE_ARCHIVE_DAYS = 30;

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

  /**
   * Count pending ideas by project using SQL COUNT (no full row hydration).
   */
  countPendingByProject: (projectId: string): number =>
    queryIdeas().project(projectId).status('pending').count(),

  /**
   * Count all pending ideas using SQL COUNT (no full row hydration).
   */
  countAllPending: (): number =>
    queryIdeas().status('pending').count(),

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

  /**
   * Atomically claim an idea for acceptance: transition fromStatus -> 'accepted'
   * and set requirement_id, only if the row is STILL at fromStatus. Returns true
   * if this call won the claim, false if a concurrent/retried accept already moved
   * it. The state machine treats accepted->accepted as an allowed no-op, so it
   * cannot prevent a double-accept on its own — this single-statement CAS does.
   */
  claimIdeaForAcceptance: (id: string, fromStatus: string, requirementId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(
      `UPDATE ideas SET status = 'accepted', requirement_id = ?, updated_at = ?
       WHERE id = ? AND status = ?`
    );
    const result = stmt.run(requirementId, getCurrentTimestamp(), id, fromStatus);
    return result.changes > 0;
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

  /**
   * Age-based archival for untouched pending ideas.
   *
   * Reversibly retires pending ideas whose `updated_at` is older than
   * `olderThanDays` by transitioning them to 'rejected' (the state machine
   * allows rejected → pending, so this is undoable) and stamping a sentinel
   * into `user_feedback`. This is a status change, NOT a deletion — the rows,
   * their scores and links survive. Optionally scoped to a single context.
   *
   * Returns the number of ideas archived.
   */
  archiveStalePendingIdeas: (
    projectId: string,
    olderThanDays: number = DEFAULT_STALE_ARCHIVE_DAYS,
    contextId?: string | null
  ): number => {
    // Guard the age: a non-positive/NaN value would archive everything. Fall
    // back to the default rather than nuking the backlog.
    const days = Number.isFinite(olderThanDays) && olderThanDays > 0
      ? Math.floor(olderThanDays)
      : DEFAULT_STALE_ARCHIVE_DAYS;

    const db = getDatabase();
    const now = getCurrentTimestamp();
    // Compute the cutoff as an ISO string in JS so it compares like-for-like with
    // updated_at (also stored via toISOString()). Mixing ISO with SQLite's
    // datetime('now', …) format ("YYYY-MM-DD HH:MM:SS", no 'T'/'Z') would make
    // the string comparison unreliable.
    const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const conditions = [
      'project_id = ?',
      "status = 'pending'",
      'updated_at < ?',
    ];
    const params: unknown[] = [STALE_ARCHIVE_FEEDBACK, now, projectId, cutoffIso];

    if (contextId !== undefined && contextId !== null) {
      conditions.push('context_id = ?');
      params.push(contextId);
    }

    const stmt = db.prepare(
      `UPDATE ideas
         SET status = 'rejected', user_feedback = ?, requirement_id = NULL, updated_at = ?
       WHERE ${conditions.join(' AND ')}`
    );
    return stmt.run(...params).changes;
  },

  deleteAllPendingIdeas: (): number =>
    queryIdeas().status('pending').delete(),
};
