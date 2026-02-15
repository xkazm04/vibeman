/**
 * Repository for persona design review test results.
 */

import { getConnection } from '../drivers';

function generateId(): string {
  return 'pdr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export const designReviewRepository = {
  /** Get all reviews sorted by test_case_name ASC */
  getAll(): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_design_reviews ORDER BY test_case_name ASC').all() as Record<string, unknown>[];
  },

  /** Get the latest review per test case (for the main UI table) */
  getLatestByTestCase(): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare(`
      SELECT r.* FROM persona_design_reviews r
      INNER JOIN (
        SELECT test_case_id, MAX(reviewed_at) as max_reviewed_at
        FROM persona_design_reviews
        GROUP BY test_case_id
      ) latest ON r.test_case_id = latest.test_case_id AND r.reviewed_at = latest.max_reviewed_at
      ORDER BY r.test_case_name ASC
    `).all() as Record<string, unknown>[];
  },

  /** Get all reviews from a specific test run */
  getByTestRunId(testRunId: string): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_design_reviews WHERE test_run_id = ? ORDER BY test_case_name ASC').all(testRunId) as Record<string, unknown>[];
  },

  /** Create a new review record */
  create(review: {
    test_case_id: string;
    test_case_name: string;
    instruction: string;
    status: string;
    structural_score: number | null;
    semantic_score: number | null;
    connectors_used: string;
    trigger_types: string;
    design_result: string | null;
    structural_evaluation: string | null;
    semantic_evaluation: string | null;
    use_case_flows?: string | null;
    test_run_id: string;
    reviewed_at: string;
  }): Record<string, unknown> {
    const db = getConnection();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO persona_design_reviews
        (id, test_case_id, test_case_name, instruction, status, structural_score, semantic_score,
         connectors_used, trigger_types, design_result, structural_evaluation, semantic_evaluation,
         use_case_flows, test_run_id, reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, review.test_case_id, review.test_case_name, review.instruction, review.status,
      review.structural_score, review.semantic_score,
      review.connectors_used, review.trigger_types,
      review.design_result, review.structural_evaluation, review.semantic_evaluation,
      review.use_case_flows ?? null, review.test_run_id, review.reviewed_at, now
    );
    return { id, ...review, created_at: now };
  },

  /** Filter reviews where connectors_used contains ANY of the given connector names */
  filterByConnectors(connectors: string[]): Record<string, unknown>[] {
    const db = getConnection();
    // Use LIKE for JSON array containment check
    const conditions = connectors.map(() => `connectors_used LIKE ?`).join(' OR ');
    const params = connectors.map(c => `%"${c}"%`);
    return db.prepare(`
      SELECT r.* FROM persona_design_reviews r
      INNER JOIN (
        SELECT test_case_id, MAX(reviewed_at) as max_reviewed_at
        FROM persona_design_reviews
        GROUP BY test_case_id
      ) latest ON r.test_case_id = latest.test_case_id AND r.reviewed_at = latest.max_reviewed_at
      WHERE ${conditions}
      ORDER BY r.test_case_name ASC
    `).all(...params) as Record<string, unknown>[];
  },

  /** Delete reviews older than the given ISO date */
  deleteOlderThan(isoDate: string): number {
    const db = getConnection();
    const result = db.prepare('DELETE FROM persona_design_reviews WHERE reviewed_at < ?').run(isoDate);
    return (result as { changes: number }).changes;
  },

  /** Get passing reviews for reference pattern matching */
  getPassingReviews(maxAgeDays: number = 30): Record<string, unknown>[] {
    const db = getConnection();
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    return db.prepare(`
      SELECT * FROM persona_design_reviews
      WHERE status = 'passed'
        AND structural_score >= 80
        AND (semantic_score >= 70 OR semantic_score IS NULL)
        AND had_references = 0
        AND reviewed_at > ?
      ORDER BY (structural_score + COALESCE(semantic_score, 0)) DESC
      LIMIT 10
    `).all(cutoff) as Record<string, unknown>[];
  },

  /** Get reviews with design_result for duplicate comparison */
  getWithDesignResult(): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare(`
      SELECT id, test_case_name, design_result
      FROM persona_design_reviews
      WHERE design_result IS NOT NULL AND status != 'error'
      ORDER BY reviewed_at DESC
      LIMIT 100
    `).all() as Record<string, unknown>[];
  },

  /** Delete all reviews (for baseline reset) */
  deleteAll(): number {
    const db = getConnection();
    const result = db.prepare('DELETE FROM persona_design_reviews').run();
    return (result as { changes: number }).changes;
  },
};
