/**
 * Predictive Intent Repository
 * Handles CRUD for context transitions and intent predictions
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DbContextTransition {
  id: string;
  project_id: string;
  from_context_id: string;
  from_context_name: string;
  to_context_id: string;
  to_context_name: string;
  transition_time_ms: number;
  signal_type: string;
  timestamp: string;
  created_at: string;
}

export interface DbIntentPrediction {
  id: string;
  project_id: string;
  predicted_context_id: string;
  predicted_context_name: string;
  confidence: number;
  from_context_id: string | null;
  from_context_name: string | null;
  reasoning: string | null;
  status: 'active' | 'accepted' | 'dismissed' | 'expired';
  created_at: string;
  resolved_at: string | null;
}

export interface CreateTransitionInput {
  id: string;
  project_id: string;
  from_context_id: string;
  from_context_name: string;
  to_context_id: string;
  to_context_name: string;
  transition_time_ms: number;
  signal_type: string;
  timestamp: string;
}

export interface CreatePredictionInput {
  id: string;
  project_id: string;
  predicted_context_id: string;
  predicted_context_name: string;
  confidence: number;
  from_context_id?: string | null;
  from_context_name?: string | null;
  reasoning?: string | null;
}

// ── Transition Counts (Markov chain data) ────────────────────────────────────

export interface TransitionCount {
  from_context_id: string;
  from_context_name: string;
  to_context_id: string;
  to_context_name: string;
  count: number;
  avg_transition_time_ms: number;
}

// ── Repository ──────────────────────────────────────────────────────────────

export const predictiveIntentRepository = {
  // ── Transitions ─────────────────────────────────────────────────────────

  createTransition: (input: CreateTransitionInput): DbContextTransition => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO context_transitions (
        id, project_id, from_context_id, from_context_name,
        to_context_id, to_context_name, transition_time_ms,
        signal_type, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.project_id,
      input.from_context_id,
      input.from_context_name,
      input.to_context_id,
      input.to_context_name,
      input.transition_time_ms,
      input.signal_type,
      input.timestamp,
      now
    );

    return selectOne<DbContextTransition>(
      db,
      'SELECT * FROM context_transitions WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get aggregated transition counts for Markov chain.
   * Groups all from→to pairs and counts occurrences.
   */
  getTransitionCounts: (
    projectId: string,
    windowDays: number = 30
  ): TransitionCount[] => {
    const db = getDatabase();
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();

    return selectAll<TransitionCount>(db, `
      SELECT
        from_context_id,
        from_context_name,
        to_context_id,
        to_context_name,
        COUNT(*) as count,
        AVG(transition_time_ms) as avg_transition_time_ms
      FROM context_transitions
      WHERE project_id = ? AND timestamp >= ?
      GROUP BY from_context_id, to_context_id
      ORDER BY count DESC
    `, projectId, since);
  },

  /**
   * Get recent transitions for a specific from_context
   */
  getTransitionsFrom: (
    projectId: string,
    fromContextId: string,
    limit: number = 20
  ): DbContextTransition[] => {
    const db = getDatabase();
    return selectAll<DbContextTransition>(db, `
      SELECT * FROM context_transitions
      WHERE project_id = ? AND from_context_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `, projectId, fromContextId, limit);
  },

  /**
   * Count total transitions for a project
   */
  getTransitionCount: (projectId: string): number => {
    const db = getDatabase();
    const result = selectOne<{ count: number }>(db,
      'SELECT COUNT(*) as count FROM context_transitions WHERE project_id = ?',
      projectId
    );
    return result?.count ?? 0;
  },

  /**
   * Clean up old transitions
   */
  deleteOldTransitions: (projectId: string, retentionDays: number = 60): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    const result = db.prepare(
      'DELETE FROM context_transitions WHERE project_id = ? AND timestamp < ?'
    ).run(projectId, cutoff);
    return (result as any).changes ?? 0;
  },

  // ── Predictions ─────────────────────────────────────────────────────────

  createPrediction: (input: CreatePredictionInput): DbIntentPrediction => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO intent_predictions (
        id, project_id, predicted_context_id, predicted_context_name,
        confidence, from_context_id, from_context_name, reasoning,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      input.id,
      input.project_id,
      input.predicted_context_id,
      input.predicted_context_name,
      input.confidence,
      input.from_context_id ?? null,
      input.from_context_name ?? null,
      input.reasoning ?? null,
      now
    );

    return selectOne<DbIntentPrediction>(
      db,
      'SELECT * FROM intent_predictions WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get active predictions for a project
   */
  getActivePredictions: (projectId: string, limit: number = 5): DbIntentPrediction[] => {
    const db = getDatabase();
    return selectAll<DbIntentPrediction>(db, `
      SELECT * FROM intent_predictions
      WHERE project_id = ? AND status = 'active'
      ORDER BY confidence DESC, created_at DESC
      LIMIT ?
    `, projectId, limit);
  },

  /**
   * Resolve a prediction (accept/dismiss/expire)
   */
  resolvePrediction: (id: string, status: 'accepted' | 'dismissed' | 'expired'): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(
      'UPDATE intent_predictions SET status = ?, resolved_at = ? WHERE id = ?'
    ).run(status, now, id);
  },

  /**
   * Expire all stale active predictions (older than N hours)
   */
  expireOldPredictions: (projectId: string, maxAgeHours: number = 4): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - maxAgeHours * 3600000).toISOString();
    const now = getCurrentTimestamp();
    const result = db.prepare(`
      UPDATE intent_predictions
      SET status = 'expired', resolved_at = ?
      WHERE project_id = ? AND status = 'active' AND created_at < ?
    `).run(now, projectId, cutoff);
    return (result as any).changes ?? 0;
  },

  /**
   * Get prediction accuracy stats (how often accepted vs dismissed)
   */
  getAccuracyStats: (projectId: string, windowDays: number = 30): {
    total: number;
    accepted: number;
    dismissed: number;
    expired: number;
    accuracyRate: number;
  } => {
    const db = getDatabase();
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();

    const rows = selectAll<{ status: string; count: number }>(db, `
      SELECT status, COUNT(*) as count
      FROM intent_predictions
      WHERE project_id = ? AND status != 'active' AND created_at >= ?
      GROUP BY status
    `, projectId, since);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = row.count;
    }

    const accepted = counts['accepted'] ?? 0;
    const dismissed = counts['dismissed'] ?? 0;
    const expired = counts['expired'] ?? 0;
    const total = accepted + dismissed + expired;

    return {
      total,
      accepted,
      dismissed,
      expired,
      accuracyRate: total > 0 ? accepted / (accepted + dismissed) : 0,
    };
  },
};
