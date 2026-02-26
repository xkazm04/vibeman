/**
 * Cross Task Plan Repository
 * Handles database operations for cross-project requirement analysis and implementation planning
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp } from './repository.utils';
import type {
  DbCrossTaskPlan,
  CreateCrossTaskPlanInput,
  CompleteCrossTaskPlanInput,
  CrossTaskStatus,
} from '../models/cross-task.types';

let tablesEnsured = false;

function ensureTables(): void {
  if (tablesEnsured) return;
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS cross_task_plans (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_ids TEXT NOT NULL,
      requirement TEXT NOT NULL,
      requirement_summary TEXT,
      prompt_used TEXT,
      plan_option_1 TEXT,
      plan_option_1_title TEXT,
      plan_option_2 TEXT,
      plan_option_2_title TEXT,
      plan_option_3 TEXT,
      plan_option_3_title TEXT,
      current_flow_analysis TEXT,
      selected_plan INTEGER,
      user_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      execution_id TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cross_task_workspace ON cross_task_plans(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_cross_task_status ON cross_task_plans(status);
    CREATE INDEX IF NOT EXISTS idx_cross_task_created ON cross_task_plans(created_at);
  `);

  tablesEnsured = true;
}

export const crossTaskPlanRepository = {
  /**
   * Ensure tables exist (called by other modules if needed)
   */
  ensureTables,

  /**
   * Get plan by ID
   */
  getById: (id: string): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM cross_task_plans WHERE id = ?');
    const result = stmt.get(id) as DbCrossTaskPlan | undefined;
    return result || null;
  },

  /**
   * Get all plans for a workspace
   */
  getByWorkspace: (workspaceId: string | null, limit: number = 50): DbCrossTaskPlan[] => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(workspaceId, limit) as DbCrossTaskPlan[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id IS NULL
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit) as DbCrossTaskPlan[];
    }
  },

  /**
   * Get running analysis for a workspace (if any)
   */
  getRunning: (workspaceId: string | null): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id = ? AND status = 'running'
        LIMIT 1
      `);
      const result = stmt.get(workspaceId) as DbCrossTaskPlan | undefined;
      return result || null;
    } else {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id IS NULL AND status = 'running'
        LIMIT 1
      `);
      const result = stmt.get() as DbCrossTaskPlan | undefined;
      return result || null;
    }
  },

  /**
   * Get plans by status
   */
  getByStatus: (status: CrossTaskStatus, limit: number = 20): DbCrossTaskPlan[] => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM cross_task_plans
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(status, limit) as DbCrossTaskPlan[];
  },

  /**
   * Create a new cross-task plan
   */
  create: (input: CreateCrossTaskPlanInput): DbCrossTaskPlan => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO cross_task_plans (
        id, workspace_id, project_ids, requirement, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run(
      input.id,
      input.workspace_id || null,
      JSON.stringify(input.project_ids),
      input.requirement,
      now,
      now
    );

    return {
      id: input.id,
      workspace_id: input.workspace_id || null,
      project_ids: JSON.stringify(input.project_ids),
      requirement: input.requirement,
      requirement_summary: null,
      prompt_used: null,
      plan_option_1: null,
      plan_option_1_title: null,
      plan_option_2: null,
      plan_option_2_title: null,
      plan_option_3: null,
      plan_option_3_title: null,
      current_flow_analysis: null,
      selected_plan: null,
      user_notes: null,
      status: 'pending' as const,
      execution_id: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Start analysis (mark as running)
   */
  startAnalysis: (id: string, executionId?: string): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE cross_task_plans
      SET status = 'running', execution_id = ?, started_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `);
    stmt.run(executionId || null, now, now, id);

    return crossTaskPlanRepository.getById(id);
  },

  /**
   * Complete plan with analysis results
   */
  completePlan: (id: string, results: CompleteCrossTaskPlanInput): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE cross_task_plans
      SET status = 'completed',
          requirement_summary = ?,
          current_flow_analysis = ?,
          plan_option_1 = ?,
          plan_option_1_title = ?,
          plan_option_2 = ?,
          plan_option_2_title = ?,
          plan_option_3 = ?,
          plan_option_3_title = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      results.requirement_summary || null,
      results.current_flow_analysis || null,
      results.plan_option_1 || null,
      results.plan_option_1_title || null,
      results.plan_option_2 || null,
      results.plan_option_2_title || null,
      results.plan_option_3 || null,
      results.plan_option_3_title || null,
      now,
      now,
      id
    );

    return crossTaskPlanRepository.getById(id);
  },

  /**
   * Fail plan with error
   */
  failPlan: (id: string, errorMessage: string): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE cross_task_plans
      SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(errorMessage, now, now, id);

    return crossTaskPlanRepository.getById(id);
  },

  /**
   * Select a plan option
   */
  selectPlan: (id: string, planNumber: 1 | 2 | 3, notes?: string): DbCrossTaskPlan | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE cross_task_plans
      SET selected_plan = ?, user_notes = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(planNumber, notes || null, now, id);

    return crossTaskPlanRepository.getById(id);
  },

  /**
   * Update prompt used for analysis
   */
  updatePrompt: (id: string, prompt: string): void => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE cross_task_plans
      SET prompt_used = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(prompt, now, id);
  },

  /**
   * Delete a plan
   */
  delete: (id: string): boolean => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM cross_task_plans WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete multiple plans (bulk delete)
   */
  deleteMany: (ids: string[]): number => {
    if (ids.length === 0) return 0;

    ensureTables();
    const db = getDatabase();

    const placeholders = ids.map(() => '?').join(', ');
    const stmt = db.prepare(`DELETE FROM cross_task_plans WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);
    return result.changes;
  },

  /**
   * Delete all plans for a workspace
   */
  deleteByWorkspace: (workspaceId: string | null): number => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare('DELETE FROM cross_task_plans WHERE workspace_id = ?');
      const result = stmt.run(workspaceId);
      return result.changes;
    } else {
      const stmt = db.prepare('DELETE FROM cross_task_plans WHERE workspace_id IS NULL');
      const result = stmt.run();
      return result.changes;
    }
  },

  /**
   * Search plans by requirement text
   */
  search: (
    workspaceId: string | null,
    query: string,
    limit: number = 20
  ): DbCrossTaskPlan[] => {
    ensureTables();
    const db = getDatabase();
    const searchPattern = `%${query}%`;

    if (workspaceId) {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id = ? AND (requirement LIKE ? OR requirement_summary LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(workspaceId, searchPattern, searchPattern, limit) as DbCrossTaskPlan[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM cross_task_plans
        WHERE workspace_id IS NULL AND (requirement LIKE ? OR requirement_summary LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(searchPattern, searchPattern, limit) as DbCrossTaskPlan[];
    }
  },

  /**
   * Get plan count by status for a workspace
   */
  getCountByStatus: (workspaceId: string | null): Record<CrossTaskStatus, number> => {
    ensureTables();
    const db = getDatabase();

    const result: Record<CrossTaskStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    let stmt;
    if (workspaceId) {
      stmt = db.prepare(`
        SELECT status, COUNT(*) as count FROM cross_task_plans
        WHERE workspace_id = ?
        GROUP BY status
      `);
    } else {
      stmt = db.prepare(`
        SELECT status, COUNT(*) as count FROM cross_task_plans
        WHERE workspace_id IS NULL
        GROUP BY status
      `);
    }

    const rows = workspaceId
      ? stmt.all(workspaceId) as Array<{ status: string; count: number }>
      : stmt.all() as Array<{ status: string; count: number }>;

    for (const row of rows) {
      if (row.status in result) {
        result[row.status as CrossTaskStatus] = row.count;
      }
    }

    return result;
  },
};
