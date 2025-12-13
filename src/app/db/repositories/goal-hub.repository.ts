/**
 * Goal Hub Repository
 * Database operations for goal hypotheses and breakdowns
 */

import { getDatabase } from '../connection';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';
import {
  DbGoalHypothesis,
  DbGoalBreakdown,
  GoalHypothesis,
  GoalBreakdown,
  HypothesisStatus,
  HypothesisCategory,
  VerificationMethod,
  EvidenceType,
  AgentResponse,
} from '../models/goal-hub.types';

// ============================================================================
// CONVERTERS
// ============================================================================

function dbToHypothesis(db: DbGoalHypothesis): GoalHypothesis {
  return {
    id: db.id,
    goalId: db.goal_id,
    projectId: db.project_id,
    title: db.title,
    statement: db.statement,
    reasoning: db.reasoning,
    category: db.category,
    priority: db.priority,
    agentSource: db.agent_source,
    status: db.status,
    verificationMethod: db.verification_method,
    evidence: db.evidence,
    evidenceType: db.evidence_type,
    verifiedAt: db.verified_at ? new Date(db.verified_at) : null,
    orderIndex: db.order_index,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

function dbToBreakdown(db: DbGoalBreakdown): GoalBreakdown {
  return {
    id: db.id,
    goalId: db.goal_id,
    projectId: db.project_id,
    promptUsed: db.prompt_used,
    modelUsed: db.model_used,
    inputTokens: db.input_tokens,
    outputTokens: db.output_tokens,
    agentResponses: JSON.parse(db.agent_responses) as AgentResponse[],
    hypothesesGenerated: db.hypotheses_generated,
    createdAt: new Date(db.created_at),
  };
}

// ============================================================================
// HYPOTHESIS REPOSITORY
// ============================================================================

export const goalHypothesisRepository = {
  /**
   * Get all hypotheses for a goal
   */
  getByGoalId(goalId: string): GoalHypothesis[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goal_hypotheses
      WHERE goal_id = ?
      ORDER BY order_index ASC, priority DESC
    `);
    const results = stmt.all(goalId) as DbGoalHypothesis[];
    return results.map(dbToHypothesis);
  },

  /**
   * Get hypothesis by ID
   */
  getById(id: string): GoalHypothesis | null {
    const db = getDatabase();
    const result = selectOne<DbGoalHypothesis>(
      db,
      'SELECT * FROM goal_hypotheses WHERE id = ?',
      id
    );
    return result ? dbToHypothesis(result) : null;
  },

  /**
   * Create a new hypothesis
   */
  create(hypothesis: {
    id: string;
    goalId: string;
    projectId: string;
    title: string;
    statement: string;
    reasoning?: string;
    category?: HypothesisCategory;
    priority?: number;
    agentSource?: string;
    orderIndex?: number;
  }): GoalHypothesis {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get max order index for this goal
    const maxOrderStmt = db.prepare(
      'SELECT MAX(order_index) as max_order FROM goal_hypotheses WHERE goal_id = ?'
    );
    const maxResult = maxOrderStmt.get(hypothesis.goalId) as { max_order: number | null };
    const orderIndex = hypothesis.orderIndex ?? (maxResult.max_order ?? -1) + 1;

    const stmt = db.prepare(`
      INSERT INTO goal_hypotheses (
        id, goal_id, project_id, title, statement, reasoning,
        category, priority, agent_source, status, verification_method,
        order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      hypothesis.id,
      hypothesis.goalId,
      hypothesis.projectId,
      hypothesis.title,
      hypothesis.statement,
      hypothesis.reasoning || null,
      hypothesis.category || 'behavior',
      hypothesis.priority ?? 5,
      hypothesis.agentSource || null,
      'unverified',
      'manual',
      orderIndex,
      now,
      now
    );

    return this.getById(hypothesis.id)!;
  },

  /**
   * Create multiple hypotheses in bulk
   */
  createBulk(hypotheses: Array<{
    id: string;
    goalId: string;
    projectId: string;
    title: string;
    statement: string;
    reasoning?: string;
    category?: HypothesisCategory;
    priority?: number;
    agentSource?: string;
  }>): GoalHypothesis[] {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get starting order index
    const goalId = hypotheses[0]?.goalId;
    if (!goalId) return [];

    const maxOrderStmt = db.prepare(
      'SELECT MAX(order_index) as max_order FROM goal_hypotheses WHERE goal_id = ?'
    );
    const maxResult = maxOrderStmt.get(goalId) as { max_order: number | null };
    let orderIndex = (maxResult.max_order ?? -1) + 1;

    const stmt = db.prepare(`
      INSERT INTO goal_hypotheses (
        id, goal_id, project_id, title, statement, reasoning,
        category, priority, agent_source, status, verification_method,
        order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: typeof hypotheses) => {
      for (const h of items) {
        stmt.run(
          h.id,
          h.goalId,
          h.projectId,
          h.title,
          h.statement,
          h.reasoning || null,
          h.category || 'behavior',
          h.priority ?? 5,
          h.agentSource || null,
          'unverified',
          'manual',
          orderIndex++,
          now,
          now
        );
      }
    });

    insertMany(hypotheses);

    return this.getByGoalId(goalId);
  },

  /**
   * Update a hypothesis
   */
  update(
    id: string,
    updates: {
      title?: string;
      statement?: string;
      reasoning?: string;
      category?: HypothesisCategory;
      priority?: number;
      status?: HypothesisStatus;
      verificationMethod?: VerificationMethod;
      evidence?: string;
      evidenceType?: EvidenceType;
      orderIndex?: number;
    }
  ): GoalHypothesis | null {
    const db = getDatabase();

    // Map camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.statement !== undefined) dbUpdates.statement = updates.statement;
    if (updates.reasoning !== undefined) dbUpdates.reasoning = updates.reasoning;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.verificationMethod !== undefined) dbUpdates.verification_method = updates.verificationMethod;
    if (updates.evidence !== undefined) dbUpdates.evidence = updates.evidence;
    if (updates.evidenceType !== undefined) dbUpdates.evidence_type = updates.evidenceType;
    if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

    const { fields, values } = buildUpdateQuery(dbUpdates);
    if (fields.length === 0) return this.getById(id);

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);

    // If status is being set to verified, also set verified_at
    if (updates.status === 'verified') {
      fields.push('verified_at = ?');
      values.push(now);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE goal_hypotheses
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    if (result.changes === 0) return null;

    return this.getById(id);
  },

  /**
   * Verify a hypothesis with evidence
   */
  verify(
    id: string,
    evidence: string,
    evidenceType: EvidenceType
  ): GoalHypothesis | null {
    return this.update(id, {
      status: 'verified',
      evidence,
      evidenceType,
    });
  },

  /**
   * Delete a hypothesis
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goal_hypotheses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all hypotheses for a goal
   */
  deleteByGoalId(goalId: string): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goal_hypotheses WHERE goal_id = ?');
    const result = stmt.run(goalId);
    return result.changes;
  },

  /**
   * Get hypothesis counts for a goal
   */
  getCounts(goalId: string): { total: number; verified: number; inProgress: number } {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
      FROM goal_hypotheses
      WHERE goal_id = ?
    `);
    const result = stmt.get(goalId) as { total: number; verified: number; in_progress: number };
    return {
      total: result.total || 0,
      verified: result.verified || 0,
      inProgress: result.in_progress || 0,
    };
  },
};

// ============================================================================
// BREAKDOWN REPOSITORY
// ============================================================================

export const goalBreakdownRepository = {
  /**
   * Get breakdown for a goal
   */
  getByGoalId(goalId: string): GoalBreakdown | null {
    const db = getDatabase();
    const result = selectOne<DbGoalBreakdown>(
      db,
      'SELECT * FROM goal_breakdowns WHERE goal_id = ? ORDER BY created_at DESC LIMIT 1',
      goalId
    );
    return result ? dbToBreakdown(result) : null;
  },

  /**
   * Get breakdown by ID
   */
  getById(id: string): GoalBreakdown | null {
    const db = getDatabase();
    const result = selectOne<DbGoalBreakdown>(
      db,
      'SELECT * FROM goal_breakdowns WHERE id = ?',
      id
    );
    return result ? dbToBreakdown(result) : null;
  },

  /**
   * Create a new breakdown
   */
  create(breakdown: {
    id: string;
    goalId: string;
    projectId: string;
    promptUsed?: string;
    modelUsed?: string;
    inputTokens?: number;
    outputTokens?: number;
    agentResponses: AgentResponse[];
    hypothesesGenerated?: number;
  }): GoalBreakdown {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO goal_breakdowns (
        id, goal_id, project_id, prompt_used, model_used,
        input_tokens, output_tokens, agent_responses, hypotheses_generated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      breakdown.id,
      breakdown.goalId,
      breakdown.projectId,
      breakdown.promptUsed || null,
      breakdown.modelUsed || null,
      breakdown.inputTokens || 0,
      breakdown.outputTokens || 0,
      JSON.stringify(breakdown.agentResponses),
      breakdown.hypothesesGenerated || 0,
      now
    );

    return this.getById(breakdown.id)!;
  },

  /**
   * Get all breakdowns for a goal (history)
   */
  getHistoryByGoalId(goalId: string, limit = 10): GoalBreakdown[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goal_breakdowns
      WHERE goal_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const results = stmt.all(goalId, limit) as DbGoalBreakdown[];
    return results.map(dbToBreakdown);
  },

  /**
   * Delete breakdown
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goal_breakdowns WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// GOAL EXTENSIONS (updates to existing goals table)
// ============================================================================

export const goalHubExtensions = {
  /**
   * Update goal progress based on hypothesis counts
   */
  updateProgress(goalId: string): void {
    const counts = goalHypothesisRepository.getCounts(goalId);
    const progress = counts.total > 0
      ? Math.round((counts.verified / counts.total) * 100)
      : 0;

    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE goals
      SET progress = ?, hypotheses_total = ?, hypotheses_verified = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(progress, counts.total, counts.verified, getCurrentTimestamp(), goalId);
  },

  /**
   * Start working on a goal
   */
  startGoal(goalId: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE goals
      SET status = 'in_progress', started_at = ?, updated_at = ?
      WHERE id = ? AND started_at IS NULL
    `);
    stmt.run(now, now, goalId);
  },

  /**
   * Complete a goal
   */
  completeGoal(goalId: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE goals
      SET status = 'done', completed_at = ?, progress = 100, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, goalId);
  },

  /**
   * Set target date for a goal
   */
  setTargetDate(goalId: string, targetDate: Date): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE goals
      SET target_date = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(targetDate.toISOString(), getCurrentTimestamp(), goalId);
  },
};
