/**
 * Insight Influence Log Repository
 *
 * Tracks which insights were shown to users during direction decisions
 * and records the outcome. Enables causal validation by comparing
 * acceptance rates for insight-influenced vs non-influenced decisions.
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, selectAll } from './repository.utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface InsightInfluenceRow {
  id: string;
  project_id: string;
  insight_id: string;
  insight_title: string;
  direction_id: string;
  decision: 'accepted' | 'rejected';
  influence_shown_at: string;
  decided_at: string;
  created_at: string;
}

export interface RecordInfluenceInput {
  projectId: string;
  insightId: string;
  insightTitle: string;
  directionId: string;
  decision: 'accepted' | 'rejected';
  influenceShownAt: string;
}

// ── Repository ───────────────────────────────────────────────────────────────

export const insightInfluenceRepository = {
  /**
   * Record that insights were shown when a direction decision was made.
   * Called during direction accept/reject flow.
   */
  recordInfluence(input: RecordInfluenceInput): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = `ifl_${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO insight_influence_log
        (id, project_id, insight_id, insight_title, direction_id, decision, influence_shown_at, decided_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      input.insightId,
      input.insightTitle,
      input.directionId,
      input.decision,
      input.influenceShownAt,
      now,
      now
    );
  },

  /**
   * Record influence for multiple insights at once (batch).
   * Used when multiple insights were visible during a single decision.
   */
  recordInfluenceBatch(
    projectId: string,
    directionId: string,
    decision: 'accepted' | 'rejected',
    insights: Array<{ id: string; title: string; shownAt: string }>
  ): number {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    let count = 0;

    const stmt = db.prepare(`
      INSERT INTO insight_influence_log
        (id, project_id, insight_id, insight_title, direction_id, decision, influence_shown_at, decided_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const insight of insights) {
      const id = `ifl_${crypto.randomUUID()}`;
      stmt.run(id, projectId, insight.id, insight.title, directionId, decision, insight.shownAt, now, now);
      count++;
    }

    return count;
  },

  /**
   * Get all influence records for a project.
   */
  getByProject(projectId: string, limit: number = 500): InsightInfluenceRow[] {
    const db = getDatabase();
    return selectAll<InsightInfluenceRow>(
      db,
      'SELECT * FROM insight_influence_log WHERE project_id = ? ORDER BY decided_at DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get influence records for a specific insight.
   */
  getByInsight(insightId: string): InsightInfluenceRow[] {
    const db = getDatabase();
    return selectAll<InsightInfluenceRow>(
      db,
      'SELECT * FROM insight_influence_log WHERE insight_id = ? ORDER BY decided_at DESC',
      insightId
    );
  },

  /**
   * Get aggregated causal stats per insight for a project.
   * Returns: for each insight, how many influenced decisions were accepted/rejected.
   */
  getCausalStats(projectId: string): Array<{
    insight_id: string;
    insight_title: string;
    influenced_accepted: number;
    influenced_rejected: number;
    influenced_total: number;
    influenced_rate: number;
  }> {
    const db = getDatabase();
    return selectAll(
      db,
      `SELECT
        insight_id,
        insight_title,
        SUM(CASE WHEN decision = 'accepted' THEN 1 ELSE 0 END) AS influenced_accepted,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) AS influenced_rejected,
        COUNT(*) AS influenced_total,
        ROUND(CAST(SUM(CASE WHEN decision = 'accepted' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 3) AS influenced_rate
      FROM insight_influence_log
      WHERE project_id = ?
      GROUP BY insight_id, insight_title
      ORDER BY influenced_total DESC`,
      projectId
    );
  },

  /**
   * Get direction IDs that were NOT influenced by any insight.
   * Used for counterfactual comparison (control group).
   */
  getUninfluencedDirectionIds(projectId: string): string[] {
    const db = getDatabase();
    const rows = selectAll<{ id: string }>(
      db,
      `SELECT d.id
       FROM directions d
       WHERE d.project_id = ? AND d.status IN ('accepted', 'rejected')
         AND d.id NOT IN (SELECT direction_id FROM insight_influence_log WHERE project_id = ?)
       ORDER BY d.created_at DESC`,
      projectId,
      projectId
    );
    return rows.map(r => r.id);
  },

  /**
   * Get total influence event count for a project.
   */
  count(projectId: string): number {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM insight_influence_log WHERE project_id = ?'
    ).get(projectId) as { count: number } | undefined;
    return row?.count ?? 0;
  },
};
