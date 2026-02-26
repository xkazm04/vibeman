/**
 * Collective Memory Repository
 * Handles CRUD operations for cross-project learning memories and their applications
 */

import { getDatabase } from '../connection';
import type {
  DbCollectiveMemoryEntry,
  DbCollectiveMemoryApplication,
  CreateCollectiveMemoryInput,
  CreateApplicationInput,
  CollectiveMemoryType,
  ApplicationOutcome,
} from '../models/collective-memory.types';
import { getCurrentTimestamp, selectOne, selectAll, generateId } from './repository.utils';

export const collectiveMemoryRepository = {
  // ─── Entry Methods ───────────────────────────────────────────────────

  /**
   * Create a new collective memory entry
   */
  create: (input: CreateCollectiveMemoryInput): DbCollectiveMemoryEntry => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('cmem');

    const sessionId = input.session_id || null;
    const taskId = input.task_id || null;
    const codePattern = input.code_pattern || null;
    const contextIds = JSON.stringify(input.context_ids || []);
    const filePatterns = JSON.stringify(input.file_patterns || []);
    const tags = JSON.stringify(input.tags || []);

    db.prepare(`
      INSERT INTO collective_memory_entries (
        id, project_id, session_id, task_id, memory_type, title, description,
        code_pattern, context_ids, file_patterns,
        tags, effectiveness_score, success_count, failure_count,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.5, 0, 0, ?, ?)
    `).run(
      id, input.project_id, sessionId, taskId,
      input.memory_type, input.title, input.description,
      codePattern, contextIds, filePatterns, tags,
      now, now
    );

    return {
      id,
      project_id: input.project_id,
      session_id: sessionId,
      task_id: taskId,
      memory_type: input.memory_type,
      title: input.title,
      description: input.description,
      code_pattern: codePattern,
      context_ids: contextIds,
      file_patterns: filePatterns,
      tags,
      effectiveness_score: 0.5,
      success_count: 0,
      failure_count: 0,
      last_applied_at: null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Get a memory entry by ID
   */
  getById: (id: string): DbCollectiveMemoryEntry | null => {
    const db = getDatabase();
    return selectOne<DbCollectiveMemoryEntry>(
      db,
      'SELECT * FROM collective_memory_entries WHERE id = ?',
      id
    );
  },

  /**
   * Get memory entries by project, ordered by effectiveness
   */
  getByProject: (projectId: string, limit: number = 50): DbCollectiveMemoryEntry[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryEntry>(
      db,
      `SELECT * FROM collective_memory_entries
       WHERE project_id = ?
       ORDER BY effectiveness_score DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get memory entries by type for a project
   */
  getByType: (projectId: string, memoryType: CollectiveMemoryType, limit: number = 20): DbCollectiveMemoryEntry[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryEntry>(
      db,
      `SELECT * FROM collective_memory_entries
       WHERE project_id = ? AND memory_type = ?
       ORDER BY effectiveness_score DESC
       LIMIT ?`,
      projectId,
      memoryType,
      limit
    );
  },

  /**
   * Get top effective memory entries (score >= 0.6)
   */
  getTopEffective: (projectId: string, limit: number = 10): DbCollectiveMemoryEntry[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryEntry>(
      db,
      `SELECT * FROM collective_memory_entries
       WHERE project_id = ? AND effectiveness_score >= 0.6
       ORDER BY effectiveness_score DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Search memory entries by title, description, tags, or code_pattern
   */
  search: (projectId: string, query: string, limit: number = 10): DbCollectiveMemoryEntry[] => {
    const db = getDatabase();
    const likeQuery = `%${query}%`;
    return selectAll<DbCollectiveMemoryEntry>(
      db,
      `SELECT * FROM collective_memory_entries
       WHERE project_id = ? AND (
         title LIKE ? OR description LIKE ? OR tags LIKE ? OR code_pattern LIKE ?
       )
       ORDER BY effectiveness_score DESC
       LIMIT ?`,
      projectId,
      likeQuery,
      likeQuery,
      likeQuery,
      likeQuery,
      limit
    );
  },

  /**
   * Find similar memory entries by overlapping file patterns or tags
   */
  findSimilar: (projectId: string, filePatterns: string[], tags: string[], limit: number = 5): DbCollectiveMemoryEntry[] => {
    const db = getDatabase();

    const conditions: string[] = [];
    const params: unknown[] = [projectId];

    for (const pattern of filePatterns) {
      conditions.push('file_patterns LIKE ?');
      params.push(`%${pattern}%`);
    }

    for (const tag of tags) {
      conditions.push('tags LIKE ?');
      params.push(`%${tag}%`);
    }

    if (conditions.length === 0) {
      return [];
    }

    const whereClause = conditions.join(' OR ');
    params.push(limit);

    return selectAll<DbCollectiveMemoryEntry>(
      db,
      `SELECT * FROM collective_memory_entries
       WHERE project_id = ? AND (${whereClause})
       ORDER BY effectiveness_score DESC
       LIMIT ?`,
      ...params
    );
  },

  /**
   * Increment success count and recalculate effectiveness score
   */
  incrementSuccess: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE collective_memory_entries
      SET success_count = success_count + 1,
          effectiveness_score = CAST((success_count + 1) AS REAL) / CAST((success_count + 1 + failure_count) AS REAL),
          updated_at = ?
      WHERE id = ?
    `).run(now, id);
  },

  /**
   * Increment failure count and recalculate effectiveness score
   */
  incrementFailure: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE collective_memory_entries
      SET failure_count = failure_count + 1,
          effectiveness_score = CAST(success_count AS REAL) / CAST((success_count + failure_count + 1) AS REAL),
          updated_at = ?
      WHERE id = ?
    `).run(now, id);
  },

  /**
   * Update last_applied_at timestamp
   */
  updateLastApplied: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE collective_memory_entries
      SET last_applied_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, id);
  },

  /**
   * Delete a memory entry by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM collective_memory_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get statistics for a project's collective memory
   */
  getStats: (projectId: string): {
    total: number;
    byType: Record<string, number>;
    avgEffectiveness: number;
    recentCount: number;
  } => {
    const db = getDatabase();

    const totals = selectOne<{ total: number; avg_eff: number }>(
      db,
      `SELECT COUNT(*) as total, COALESCE(AVG(effectiveness_score), 0) as avg_eff
       FROM collective_memory_entries
       WHERE project_id = ?`,
      projectId
    );

    const typeRows = selectAll<{ memory_type: string; count: number }>(
      db,
      `SELECT memory_type, COUNT(*) as count
       FROM collective_memory_entries
       WHERE project_id = ?
       GROUP BY memory_type`,
      projectId
    );

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.memory_type] = row.count;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recent = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count
       FROM collective_memory_entries
       WHERE project_id = ? AND created_at >= ?`,
      projectId,
      sevenDaysAgo
    );

    return {
      total: totals?.total ?? 0,
      byType,
      avgEffectiveness: totals?.avg_eff ?? 0,
      recentCount: recent?.count ?? 0,
    };
  },

  // ─── Application Methods ─────────────────────────────────────────────

  /**
   * Create a new application record
   */
  createApplication: (input: CreateApplicationInput): DbCollectiveMemoryApplication => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('capp');

    const sessionId = input.session_id || null;
    const taskId = input.task_id || null;
    const requirementName = input.requirement_name || null;

    db.prepare(`
      INSERT INTO collective_memory_applications (
        id, memory_id, project_id, session_id, task_id, requirement_name, applied_at, outcome
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, input.memory_id, input.project_id, sessionId, taskId, requirementName, now);

    return {
      id,
      memory_id: input.memory_id,
      project_id: input.project_id,
      session_id: sessionId,
      task_id: taskId,
      requirement_name: requirementName,
      applied_at: now,
      outcome: 'pending',
      outcome_details: null,
      resolved_at: null,
    };
  },

  /**
   * Resolve an application with outcome and optionally update the memory entry scores
   */
  resolveApplication: (id: string, outcome: ApplicationOutcome, details?: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get the application to find the memory_id
    const app = selectOne<DbCollectiveMemoryApplication>(
      db,
      'SELECT * FROM collective_memory_applications WHERE id = ?',
      id
    );

    if (!app) return;

    // Update the application
    db.prepare(`
      UPDATE collective_memory_applications
      SET outcome = ?, outcome_details = ?, resolved_at = ?
      WHERE id = ?
    `).run(outcome, details || null, now, id);

    // Update the memory entry scores based on outcome
    if (outcome === 'success') {
      collectiveMemoryRepository.incrementSuccess(app.memory_id);
    } else if (outcome === 'failure') {
      collectiveMemoryRepository.incrementFailure(app.memory_id);
    }
  },

  /**
   * Get applications for a specific memory entry
   */
  getApplicationsByMemory: (memoryId: string, limit: number = 20): DbCollectiveMemoryApplication[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryApplication>(
      db,
      `SELECT * FROM collective_memory_applications
       WHERE memory_id = ?
       ORDER BY applied_at DESC
       LIMIT ?`,
      memoryId,
      limit
    );
  },

  /**
   * Get recent applications across a project
   */
  getRecentApplications: (projectId: string, limit: number = 20): DbCollectiveMemoryApplication[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryApplication>(
      db,
      `SELECT * FROM collective_memory_applications
       WHERE project_id = ?
       ORDER BY applied_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get effectiveness trends over time (daily aggregation)
   */
  getEffectivenessTrends: (projectId: string, days: number = 30): { date: string; score: number; memoryCount: number }[] => {
    const db = getDatabase();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return selectAll<{ date: string; score: number; memoryCount: number }>(
      db,
      `SELECT
         DATE(created_at) as date,
         AVG(effectiveness_score) as score,
         COUNT(*) as memoryCount
       FROM collective_memory_entries
       WHERE project_id = ? AND DATE(created_at) >= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      projectId,
      since
    );
  },

  /**
   * Get memory entries with full application history joined
   */
  getWithApplicationCount: (projectId: string, limit: number = 50): (DbCollectiveMemoryEntry & { application_count: number })[] => {
    const db = getDatabase();
    return selectAll<DbCollectiveMemoryEntry & { application_count: number }>(
      db,
      `SELECT e.*, COALESCE(a.cnt, 0) as application_count
       FROM collective_memory_entries e
       LEFT JOIN (
         SELECT memory_id, COUNT(*) as cnt FROM collective_memory_applications GROUP BY memory_id
       ) a ON a.memory_id = e.id
       WHERE e.project_id = ?
       ORDER BY e.effectiveness_score DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },
};
