/**
 * Autonomous Agent Repository
 * Manages agent goals and execution steps
 */

import { getDatabase } from '../connection';
import type { DbAgentGoal, DbAgentStep, AgentGoalStatus, AgentStepStatus } from '../models/types';
import { selectOne, selectAll, getCurrentTimestamp } from './repository.utils';

function db() {
  return getDatabase();
}

function generateId(): string {
  return `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Goals ───

export const agentGoalRepository = {
  create(projectId: string, objective: string): DbAgentGoal {
    const id = generateId();
    const now = getCurrentTimestamp();
    db().prepare(`
      INSERT INTO agent_goals (id, project_id, objective, status, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(id, projectId, objective, now, now);

    return this.getById(id)!;
  },

  getById(id: string): DbAgentGoal | null {
    return selectOne<DbAgentGoal>(db(), 'SELECT * FROM agent_goals WHERE id = ?', id);
  },

  getByProject(projectId: string, limit = 20): DbAgentGoal[] {
    return selectAll<DbAgentGoal>(
      db(),
      'SELECT * FROM agent_goals WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
      projectId, limit
    );
  },

  getActive(projectId: string): DbAgentGoal | null {
    return selectOne<DbAgentGoal>(
      db(),
      `SELECT * FROM agent_goals WHERE project_id = ? AND status IN ('pending', 'decomposing', 'running', 'paused') ORDER BY created_at DESC LIMIT 1`,
      projectId
    );
  },

  updateStatus(id: string, status: AgentGoalStatus, extra?: Partial<DbAgentGoal>): void {
    const now = getCurrentTimestamp();
    const sets = ['status = ?', 'updated_at = ?'];
    const params: unknown[] = [status, now];

    if (extra?.strategy !== undefined) { sets.push('strategy = ?'); params.push(extra.strategy); }
    if (extra?.total_steps !== undefined) { sets.push('total_steps = ?'); params.push(extra.total_steps); }
    if (extra?.completed_steps !== undefined) { sets.push('completed_steps = ?'); params.push(extra.completed_steps); }
    if (extra?.failed_steps !== undefined) { sets.push('failed_steps = ?'); params.push(extra.failed_steps); }
    if (extra?.current_step_id !== undefined) { sets.push('current_step_id = ?'); params.push(extra.current_step_id); }
    if (extra?.result_summary !== undefined) { sets.push('result_summary = ?'); params.push(extra.result_summary); }
    if (extra?.error_message !== undefined) { sets.push('error_message = ?'); params.push(extra.error_message); }
    if (extra?.started_at !== undefined) { sets.push('started_at = ?'); params.push(extra.started_at); }
    if (extra?.completed_at !== undefined) { sets.push('completed_at = ?'); params.push(extra.completed_at); }

    params.push(id);
    db().prepare(`UPDATE agent_goals SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },

  incrementCompleted(id: string): void {
    const now = getCurrentTimestamp();
    db().prepare(`UPDATE agent_goals SET completed_steps = completed_steps + 1, updated_at = ? WHERE id = ?`).run(now, id);
  },

  incrementFailed(id: string): void {
    const now = getCurrentTimestamp();
    db().prepare(`UPDATE agent_goals SET failed_steps = failed_steps + 1, updated_at = ? WHERE id = ?`).run(now, id);
  },
};

// ─── Steps ───

export const agentStepRepository = {
  createBatch(goalId: string, steps: Array<{ title: string; description: string; toolName?: string; toolInput?: string }>): DbAgentStep[] {
    const insertStmt = db().prepare(`
      INSERT INTO agent_steps (id, goal_id, order_index, title, description, tool_name, tool_input, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    const now = getCurrentTimestamp();
    const created: DbAgentStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const id = `${goalId}-s${i}`;
      insertStmt.run(id, goalId, i, step.title, step.description, step.toolName || null, step.toolInput || null, now);
      created.push({
        id,
        goal_id: goalId,
        order_index: i,
        title: step.title,
        description: step.description,
        tool_name: step.toolName || null,
        tool_input: step.toolInput || null,
        status: 'pending',
        result: null,
        error_message: null,
        tokens_used: 0,
        started_at: null,
        completed_at: null,
        created_at: now,
      });
    }

    return created;
  },

  getByGoal(goalId: string): DbAgentStep[] {
    return selectAll<DbAgentStep>(
      db(),
      'SELECT * FROM agent_steps WHERE goal_id = ? ORDER BY order_index ASC',
      goalId
    );
  },

  getNextPending(goalId: string): DbAgentStep | null {
    return selectOne<DbAgentStep>(
      db(),
      `SELECT * FROM agent_steps WHERE goal_id = ? AND status = 'pending' ORDER BY order_index ASC LIMIT 1`,
      goalId
    );
  },

  updateStatus(id: string, status: AgentStepStatus, extra?: { result?: string; error_message?: string; tokens_used?: number }): void {
    const now = getCurrentTimestamp();
    const sets = ['status = ?'];
    const params: unknown[] = [status];

    if (status === 'running') { sets.push('started_at = ?'); params.push(now); }
    if (status === 'completed' || status === 'failed') { sets.push('completed_at = ?'); params.push(now); }
    if (extra?.result !== undefined) { sets.push('result = ?'); params.push(extra.result); }
    if (extra?.error_message !== undefined) { sets.push('error_message = ?'); params.push(extra.error_message); }
    if (extra?.tokens_used !== undefined) { sets.push('tokens_used = ?'); params.push(extra.tokens_used); }

    params.push(id);
    db().prepare(`UPDATE agent_steps SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },
};
