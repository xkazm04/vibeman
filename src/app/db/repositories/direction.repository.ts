import { getDatabase } from '../connection';
import { DbDirection } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/**
 * Direction Repository
 * Handles all database operations for directions (actionable development guidance)
 * Directions are generated per context_map entry and when accepted, create Claude Code requirements
 */
export const directionRepository = {
  /**
   * Get all directions for a project
   */
  getDirectionsByProject: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get all directions for multiple projects (batch query)
   * Uses IN clause for efficient single-query retrieval
   */
  getDirectionsByProjects: (projectIds: string[]): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getDirectionsByProject(projectIds[0]);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders})
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds) as DbDirection[];
  },

  /**
   * Get directions by context_map_id
   */
  getDirectionsByContextMapId: (projectId: string, contextMapId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_map_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextMapId) as DbDirection[];
  },

  /**
   * Get directions by context_map_id for multiple projects (batch query)
   */
  getDirectionsByContextMapIdMultiple: (projectIds: string[], contextMapId: string): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getDirectionsByContextMapId(projectIds[0], contextMapId);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND context_map_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds, contextMapId) as DbDirection[];
  },

  /**
   * Get pending directions for a project
   */
  getPendingDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get pending directions for multiple projects (batch query)
   */
  getPendingDirectionsMultiple: (projectIds: string[]): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getPendingDirections(projectIds[0]);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds) as DbDirection[];
  },

  /**
   * Get accepted directions for a project
   */
  getAcceptedDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'accepted'
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get accepted directions for multiple projects (batch query)
   */
  getAcceptedDirectionsMultiple: (projectIds: string[]): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getAcceptedDirections(projectIds[0]);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND status = 'accepted'
      ORDER BY updated_at DESC
    `);
    return stmt.all(...projectIds) as DbDirection[];
  },

  /**
   * Get rejected directions for a project
   */
  getRejectedDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'rejected'
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get rejected directions for multiple projects (batch query)
   */
  getRejectedDirectionsMultiple: (projectIds: string[]): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getRejectedDirections(projectIds[0]);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND status = 'rejected'
      ORDER BY updated_at DESC
    `);
    return stmt.all(...projectIds) as DbDirection[];
  },

  /**
   * Get all pending directions across all projects (for Tinder "all projects" mode)
   */
  getAllPendingDirections: (): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbDirection[];
  },

  /**
   * Delete all pending directions for a project (for Tinder flush)
   */
  deletePendingDirectionsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ? AND status = ?');
    const result = stmt.run(projectId, 'pending');
    return result.changes;
  },

  /**
   * Delete all pending directions across all projects (for Tinder flush all)
   */
  deleteAllPendingDirections: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE status = ?');
    const result = stmt.run('pending');
    return result.changes;
  },

  /**
   * Get a single direction by ID
   */
  getDirectionById: (directionId: string): DbDirection | null => {
    const db = getDatabase();
    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', directionId);
  },

  /**
   * Get multiple directions by IDs in a single query.
   * Returns a Map keyed by direction ID for O(1) lookup.
   */
  getDirectionsByIds: (ids: string[]): Map<string, DbDirection> => {
    const result = new Map<string, DbDirection>();
    if (ids.length === 0) return result;

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const rows = selectAll<DbDirection>(
      db,
      `SELECT * FROM directions WHERE id IN (${placeholders})`,
      ...ids
    );

    for (const row of rows) {
      result.set(row.id, row);
    }

    return result;
  },

  /**
   * Get directions by SQLite context_id
   */
  getDirectionsByContextId: (projectId: string, contextId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextId) as DbDirection[];
  },

  /**
   * Get directions by context_id for multiple projects (batch query)
   */
  getDirectionsByContextIdMultiple: (projectIds: string[], contextId: string): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getDirectionsByContextId(projectIds[0], contextId);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds, contextId) as DbDirection[];
  },

  /**
   * Get directions by SQLite context_group_id
   */
  getDirectionsByContextGroupId: (projectId: string, contextGroupId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_group_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextGroupId) as DbDirection[];
  },

  /**
   * Get directions by context_group_id for multiple projects (batch query)
   */
  getDirectionsByContextGroupIdMultiple: (projectIds: string[], contextGroupId: string): DbDirection[] => {
    if (projectIds.length === 0) return [];
    if (projectIds.length === 1) {
      return directionRepository.getDirectionsByContextGroupId(projectIds[0], contextGroupId);
    }
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id IN (${placeholders}) AND context_group_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(...projectIds, contextGroupId) as DbDirection[];
  },

  /**
   * Create a new direction
   */
  createDirection: (direction: {
    id: string;
    project_id: string;
    context_map_id: string;
    context_map_title: string;
    direction: string;
    summary: string;
    status?: 'pending' | 'processing' | 'accepted' | 'rejected';
    requirement_id?: string | null;
    requirement_path?: string | null;
    // NEW: SQLite context fields
    context_id?: string | null;
    context_name?: string | null;
    context_group_id?: string | null;
    // NEW: Paired directions support
    pair_id?: string | null;
    pair_label?: 'A' | 'B' | null;
    problem_statement?: string | null;
    // Effort/impact scoring
    effort?: number | null;
    impact?: number | null;
  }): DbDirection => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO directions (
        id, project_id, context_map_id, context_map_title, direction, summary, status,
        requirement_id, requirement_path, context_id, context_name, context_group_id,
        pair_id, pair_label, problem_statement, effort, impact,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      direction.id,
      direction.project_id,
      direction.context_map_id,
      direction.context_map_title,
      direction.direction,
      direction.summary,
      direction.status || 'pending',
      direction.requirement_id || null,
      direction.requirement_path || null,
      direction.context_id || null,
      direction.context_name || null,
      direction.context_group_id || null,
      direction.pair_id || null,
      direction.pair_label || null,
      direction.problem_statement || null,
      direction.effort ?? null,
      direction.impact ?? null,
      now,
      now
    );

    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', direction.id)!;
  },

  /**
   * Update a direction
   */
  updateDirection: (id: string, updates: {
    direction?: string;
    summary?: string;
    status?: 'pending' | 'processing' | 'accepted' | 'rejected';
    requirement_id?: string | null;
    requirement_path?: string | null;
    context_map_title?: string;
    decision_record?: string | null;
    // NEW: SQLite context fields
    context_id?: string | null;
    context_name?: string | null;
    context_group_id?: string | null;
    // Effort/impact scoring
    effort?: number | null;
    impact?: number | null;
  }): DbDirection | null => {
    const db = getDatabase();
    const { fields, values } = buildUpdateQuery(updates);

    if (fields.length === 0) {
      return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', id);
    }

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE directions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', id);
  },

  /**
   * Atomically claim a direction for processing (idempotency protection)
   *
   * This method prevents double-processing by atomically updating the status
   * only if it's currently 'pending'. Returns true only if this call
   * successfully claimed the direction.
   *
   * Use this BEFORE doing expensive operations (creating requirement files, etc.)
   * to ensure only one request processes a direction even with concurrent requests.
   *
   * @param id - The direction ID to claim
   * @returns true if successfully claimed (was pending), false if already processed
   */
  claimDirectionForProcessing: (id: string): boolean => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Atomic conditional update - only succeeds if status is 'pending'
    const stmt = db.prepare(`
      UPDATE directions
      SET status = 'processing', updated_at = ?
      WHERE id = ? AND status = 'pending'
    `);

    const result = stmt.run(now, id);
    return result.changes > 0;
  },

  /**
   * Accept a direction (creates requirement and updates status)
   */
  acceptDirection: (id: string, requirementId: string, requirementPath: string, decisionRecord?: string | null): DbDirection | null => {
    return directionRepository.updateDirection(id, {
      status: 'accepted',
      requirement_id: requirementId,
      requirement_path: requirementPath,
      decision_record: decisionRecord ?? null,
    });
  },

  /**
   * Reject a direction
   */
  rejectDirection: (id: string): DbDirection | null => {
    return directionRepository.updateDirection(id, {
      status: 'rejected'
    });
  },

  /**
   * Delete a direction
   */
  deleteDirection: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all directions for a project
   */
  deleteDirectionsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Delete directions by context_map_id
   */
  deleteDirectionsByContextMapId: (projectId: string, contextMapId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ? AND context_map_id = ?');
    const result = stmt.run(projectId, contextMapId);
    return result.changes;
  },

  /**
   * Get direction count by status for a project
   */
  getDirectionCounts: (projectId: string): { pending: number; accepted: number; rejected: number; total: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM directions
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { total: number; pending: number; accepted: number; rejected: number };
    return {
      total: result.total || 0,
      pending: result.pending || 0,
      accepted: result.accepted || 0,
      rejected: result.rejected || 0
    };
  },

  /**
   * Get aggregated direction counts across multiple projects
   */
  getDirectionCountsMultiple: (projectIds: string[]): { pending: number; accepted: number; rejected: number; total: number } => {
    if (projectIds.length === 0) {
      return { pending: 0, accepted: 0, rejected: 0, total: 0 };
    }

    if (projectIds.length === 1) {
      return directionRepository.getDirectionCounts(projectIds[0]);
    }

    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM directions
      WHERE project_id IN (${placeholders})
    `);
    const result = stmt.get(...projectIds) as { total: number; pending: number; accepted: number; rejected: number };
    return {
      total: result.total || 0,
      pending: result.pending || 0,
      accepted: result.accepted || 0,
      rejected: result.rejected || 0
    };
  },

  /**
   * Count decided directions (accepted or rejected) since a given date for a project
   */
  getDecidedCountSince: (projectId: string, since?: Date | null): number => {
    const db = getDatabase();
    if (since) {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM directions
        WHERE project_id = ? AND status IN ('accepted', 'rejected') AND updated_at > ?
      `);
      const result = stmt.get(projectId, since.toISOString()) as { count: number };
      return result.count || 0;
    } else {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM directions
        WHERE project_id = ? AND status IN ('accepted', 'rejected')
      `);
      const result = stmt.get(projectId) as { count: number };
      return result.count || 0;
    }
  },

  /**
   * Count decided directions (accepted or rejected) since a given date for multiple projects
   */
  getDecidedCountSinceMultiple: (projectIds: string[], since?: Date | null): number => {
    if (projectIds.length === 0) return 0;
    const db = getDatabase();
    const placeholders = projectIds.map(() => '?').join(', ');
    if (since) {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM directions
        WHERE project_id IN (${placeholders}) AND status IN ('accepted', 'rejected') AND updated_at > ?
      `);
      const result = stmt.get(...projectIds, since.toISOString()) as { count: number };
      return result.count || 0;
    } else {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM directions
        WHERE project_id IN (${placeholders}) AND status IN ('accepted', 'rejected')
      `);
      const result = stmt.get(...projectIds) as { count: number };
      return result.count || 0;
    }
  },

  /**
   * Get direction counts grouped by context_map_id (SQL aggregation)
   */
  getDirectionCountsByContextMap: (projectId: string): Array<{
    context_map_id: string;
    context_map_title: string;
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        context_map_id,
        context_map_title,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM directions
      WHERE project_id = ?
      GROUP BY context_map_id, context_map_title
    `);
    return stmt.all(projectId) as Array<{
      context_map_id: string;
      context_map_title: string;
      total: number;
      pending: number;
      accepted: number;
      rejected: number;
    }>;
  },

  /**
   * Get direction counts grouped by day (SQL aggregation)
   */
  getDirectionDailyCounts: (projectId: string, days: number = 7): Array<{
    date: string;
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM directions
      WHERE project_id = ?
        AND created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return stmt.all(projectId, days) as Array<{
      date: string;
      total: number;
      pending: number;
      accepted: number;
      rejected: number;
    }>;
  },

  // ============ Paired Directions Support ============

  /**
   * Get the paired direction for a given direction
   * Returns null if no pair exists
   */
  getPairedDirection: (directionId: string): DbDirection | null => {
    const db = getDatabase();
    const direction = selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', directionId);

    if (!direction || !direction.pair_id) {
      return null;
    }

    // Get the other direction in the pair
    return selectOne<DbDirection>(
      db,
      'SELECT * FROM directions WHERE pair_id = ? AND id != ?',
      direction.pair_id,
      directionId
    );
  },

  /**
   * Get both directions in a pair by pair_id
   */
  getDirectionPair: (pairId: string): { directionA: DbDirection | null; directionB: DbDirection | null } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE pair_id = ?
      ORDER BY pair_label ASC
    `);
    const results = stmt.all(pairId) as DbDirection[];

    return {
      directionA: results.find(d => d.pair_label === 'A') || null,
      directionB: results.find(d => d.pair_label === 'B') || null,
    };
  },

  /**
   * Get all pending direction pairs for a project
   * Groups single and paired directions
   */
  getPendingDirectionsGrouped: (projectId: string): {
    singles: DbDirection[];
    pairs: Array<{ pairId: string; problemStatement: string | null; directionA: DbDirection; directionB: DbDirection }>;
  } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `);
    const allDirections = stmt.all(projectId) as DbDirection[];

    const singles: DbDirection[] = [];
    const pairsMap = new Map<string, DbDirection[]>();

    for (const direction of allDirections) {
      if (direction.pair_id) {
        const existing = pairsMap.get(direction.pair_id) || [];
        existing.push(direction);
        pairsMap.set(direction.pair_id, existing);
      } else {
        singles.push(direction);
      }
    }

    const pairs: Array<{ pairId: string; problemStatement: string | null; directionA: DbDirection; directionB: DbDirection }> = [];

    for (const [pairId, directions] of pairsMap) {
      if (directions.length === 2) {
        const dirA = directions.find(d => d.pair_label === 'A');
        const dirB = directions.find(d => d.pair_label === 'B');
        if (dirA && dirB) {
          pairs.push({
            pairId,
            problemStatement: dirA.problem_statement || dirB.problem_statement,
            directionA: dirA,
            directionB: dirB,
          });
        }
      } else {
        // Incomplete pair, treat as singles
        singles.push(...directions);
      }
    }

    return { singles, pairs };
  },

  /**
   * Accept one direction from a pair and reject the other
   */
  acceptPairedDirection: (
    acceptedId: string,
    requirementId: string,
    requirementPath: string,
    decisionRecord?: string | null
  ): { accepted: DbDirection | null; rejected: DbDirection | null } => {
    const acceptedDirection = directionRepository.acceptDirection(acceptedId, requirementId, requirementPath, decisionRecord);

    if (!acceptedDirection || !acceptedDirection.pair_id) {
      return { accepted: acceptedDirection, rejected: null };
    }

    // Reject the other direction in the pair
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE directions
      SET status = 'rejected', updated_at = ?
      WHERE pair_id = ? AND id != ? AND status = 'pending'
    `);
    stmt.run(now, acceptedDirection.pair_id, acceptedId);

    const rejected = selectOne<DbDirection>(
      db,
      'SELECT * FROM directions WHERE pair_id = ? AND id != ?',
      acceptedDirection.pair_id,
      acceptedId
    );

    return { accepted: acceptedDirection, rejected };
  },

  /**
   * Reject both directions in a pair
   */
  rejectDirectionPair: (pairId: string): number => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE directions
      SET status = 'rejected', updated_at = ?
      WHERE pair_id = ? AND status = 'pending'
    `);

    const result = stmt.run(now, pairId);
    return result.changes;
  },

  /**
   * Delete both directions in a pair
   */
  deleteDirectionPair: (pairId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE pair_id = ?');
    const result = stmt.run(pairId);
    return result.changes;
  },
};
