/**
 * Schema Intelligence Repository
 *
 * CRUD operations for query patterns, schema recommendations,
 * and optimization history tables.
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, generateId, withTableCheck } from './repository.utils';

// ─── Types ────────────────────────────────────────────────────────

export type QueryOperationType = 'select' | 'insert' | 'update' | 'delete';
export type RecommendationCategory =
  | 'missing_index'
  | 'denormalization'
  | 'column_type'
  | 'dead_table'
  | 'query_optimization'
  | 'schema_cleanup';
export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'applied' | 'rolled_back';
export type OptimizationAction = 'accepted' | 'rejected' | 'applied' | 'rolled_back';

export interface DbQueryPattern {
  id: string;
  project_id: string;
  query_hash: string;
  query_template: string;
  table_names: string;        // JSON array of table names
  operation_type: QueryOperationType;
  execution_count: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  max_duration_ms: number;
  last_executed_at: string;
  first_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbSchemaRecommendation {
  id: string;
  project_id: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  affected_tables: string;     // JSON array
  migration_sql: string | null;
  rollback_sql: string | null;
  impact_analysis: string | null;
  risk_assessment: string | null;
  expected_improvement: string | null;
  status: RecommendationStatus;
  applied_at: string | null;
  source_query_patterns: string | null;  // JSON array of pattern IDs
  ai_confidence: number;
  created_at: string;
  updated_at: string;
}

export interface DbOptimizationHistory {
  id: string;
  project_id: string;
  recommendation_id: string;
  action: OptimizationAction;
  reason: string | null;
  performance_before: string | null;  // JSON
  performance_after: string | null;   // JSON
  created_at: string;
}

// ─── Query Pattern Repository ─────────────────────────────────────

export const queryPatternRepository = {
  upsert(input: {
    queryHash: string;
    queryTemplate: string;
    tableNames: string[];
    operationType: QueryOperationType;
    durationMs: number;
    projectId?: string;
  }): DbQueryPattern {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const now = getCurrentTimestamp();
      const projectId = input.projectId || 'default';

      // Try to find existing pattern
      const existing = db.prepare(
        'SELECT * FROM query_patterns WHERE query_hash = ? AND project_id = ?'
      ).get(input.queryHash, projectId) as DbQueryPattern | undefined;

      if (existing) {
        const newCount = existing.execution_count + 1;
        const newTotal = existing.total_duration_ms + input.durationMs;
        const newAvg = newTotal / newCount;
        const newMax = Math.max(existing.max_duration_ms, input.durationMs);

        db.prepare(`
          UPDATE query_patterns
          SET execution_count = ?, total_duration_ms = ?, avg_duration_ms = ?,
              max_duration_ms = ?, last_executed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(newCount, newTotal, newAvg, newMax, now, now, existing.id);

        return { ...existing, execution_count: newCount, total_duration_ms: newTotal, avg_duration_ms: newAvg, max_duration_ms: newMax, last_executed_at: now, updated_at: now };
      }

      const id = generateId('qp');
      db.prepare(`
        INSERT INTO query_patterns (id, project_id, query_hash, query_template, table_names,
          operation_type, execution_count, total_duration_ms, avg_duration_ms, max_duration_ms,
          last_executed_at, first_seen_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, input.queryHash, input.queryTemplate,
        JSON.stringify(input.tableNames), input.operationType,
        input.durationMs, input.durationMs, input.durationMs,
        now, now, now, now
      );

      return db.prepare('SELECT * FROM query_patterns WHERE id = ?').get(id) as DbQueryPattern;
    });
  },

  getTopByFrequency(projectId: string = 'default', limit: number = 50): DbQueryPattern[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM query_patterns WHERE project_id = ? ORDER BY execution_count DESC LIMIT ?'
      ).all(projectId, limit) as DbQueryPattern[];
    });
  },

  getTopBySlowest(projectId: string = 'default', limit: number = 50): DbQueryPattern[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM query_patterns WHERE project_id = ? ORDER BY avg_duration_ms DESC LIMIT ?'
      ).all(projectId, limit) as DbQueryPattern[];
    });
  },

  getAll(projectId: string = 'default'): DbQueryPattern[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM query_patterns WHERE project_id = ? ORDER BY execution_count DESC'
      ).all(projectId) as DbQueryPattern[];
    });
  },

  getStats(projectId: string = 'default'): {
    totalPatterns: number;
    totalExecutions: number;
    avgDurationMs: number;
    slowestQueryMs: number;
  } {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const row = db.prepare(`
        SELECT
          COUNT(*) as total_patterns,
          COALESCE(SUM(execution_count), 0) as total_executions,
          COALESCE(AVG(avg_duration_ms), 0) as avg_duration,
          COALESCE(MAX(max_duration_ms), 0) as slowest_query
        FROM query_patterns WHERE project_id = ?
      `).get(projectId) as { total_patterns: number; total_executions: number; avg_duration: number; slowest_query: number };

      return {
        totalPatterns: row.total_patterns,
        totalExecutions: row.total_executions,
        avgDurationMs: row.avg_duration,
        slowestQueryMs: row.slowest_query,
      };
    });
  },

  cleanup(olderThanDays: number = 30, projectId: string = 'default'): number {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
      const result = db.prepare(
        'DELETE FROM query_patterns WHERE project_id = ? AND last_executed_at < ? AND execution_count < 5'
      ).run(projectId, cutoff);
      return result.changes;
    });
  },
};

// ─── Schema Recommendation Repository ─────────────────────────────

export const schemaRecommendationRepository = {
  create(input: {
    category: RecommendationCategory;
    severity: RecommendationSeverity;
    title: string;
    description: string;
    affectedTables: string[];
    migrationSql?: string;
    rollbackSql?: string;
    impactAnalysis?: string;
    riskAssessment?: string;
    expectedImprovement?: string;
    sourceQueryPatterns?: string[];
    aiConfidence?: number;
    projectId?: string;
  }): DbSchemaRecommendation {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const id = generateId('sr');
      const now = getCurrentTimestamp();
      const projectId = input.projectId || 'default';

      db.prepare(`
        INSERT INTO schema_recommendations (id, project_id, category, severity, title, description,
          affected_tables, migration_sql, rollback_sql, impact_analysis, risk_assessment,
          expected_improvement, source_query_patterns, ai_confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, input.category, input.severity, input.title, input.description,
        JSON.stringify(input.affectedTables),
        input.migrationSql || null,
        input.rollbackSql || null,
        input.impactAnalysis || null,
        input.riskAssessment || null,
        input.expectedImprovement || null,
        input.sourceQueryPatterns ? JSON.stringify(input.sourceQueryPatterns) : null,
        input.aiConfidence ?? 0,
        now, now
      );

      return db.prepare('SELECT * FROM schema_recommendations WHERE id = ?').get(id) as DbSchemaRecommendation;
    });
  },

  getById(id: string): DbSchemaRecommendation | null {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return (db.prepare('SELECT * FROM schema_recommendations WHERE id = ?').get(id) as DbSchemaRecommendation) || null;
    });
  },

  getByStatus(status: RecommendationStatus, projectId: string = 'default'): DbSchemaRecommendation[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM schema_recommendations WHERE status = ? AND project_id = ? ORDER BY severity, created_at DESC'
      ).all(status, projectId) as DbSchemaRecommendation[];
    });
  },

  getAll(projectId: string = 'default'): DbSchemaRecommendation[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM schema_recommendations WHERE project_id = ? ORDER BY created_at DESC'
      ).all(projectId) as DbSchemaRecommendation[];
    });
  },

  getPending(projectId: string = 'default'): DbSchemaRecommendation[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM schema_recommendations WHERE status = \'pending\' AND project_id = ? ORDER BY severity, created_at DESC'
      ).all(projectId) as DbSchemaRecommendation[];
    });
  },

  updateStatus(id: string, status: RecommendationStatus): DbSchemaRecommendation | null {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const now = getCurrentTimestamp();
      const appliedAt = status === 'applied' ? now : null;

      db.prepare(`
        UPDATE schema_recommendations
        SET status = ?, applied_at = COALESCE(?, applied_at), updated_at = ?
        WHERE id = ?
      `).run(status, appliedAt, now, id);

      return (db.prepare('SELECT * FROM schema_recommendations WHERE id = ?').get(id) as DbSchemaRecommendation) || null;
    });
  },

  getSummary(projectId: string = 'default'): {
    pending: number;
    accepted: number;
    rejected: number;
    applied: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();

      const statusCounts = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM schema_recommendations WHERE project_id = ?
        GROUP BY status
      `).all(projectId) as Array<{ status: string; count: number }>;

      const categoryCounts = db.prepare(`
        SELECT category, COUNT(*) as count
        FROM schema_recommendations WHERE project_id = ?
        GROUP BY category
      `).all(projectId) as Array<{ category: string; count: number }>;

      const severityCounts = db.prepare(`
        SELECT severity, COUNT(*) as count
        FROM schema_recommendations WHERE project_id = ?
        GROUP BY severity
      `).all(projectId) as Array<{ severity: string; count: number }>;

      const statusMap: Record<string, number> = {};
      for (const row of statusCounts) statusMap[row.status] = row.count;

      const byCategory: Record<string, number> = {};
      for (const row of categoryCounts) byCategory[row.category] = row.count;

      const bySeverity: Record<string, number> = {};
      for (const row of severityCounts) bySeverity[row.severity] = row.count;

      return {
        pending: statusMap['pending'] || 0,
        accepted: statusMap['accepted'] || 0,
        rejected: statusMap['rejected'] || 0,
        applied: statusMap['applied'] || 0,
        byCategory,
        bySeverity,
      };
    });
  },
};

// ─── Optimization History Repository ──────────────────────────────

export const optimizationHistoryRepository = {
  record(input: {
    recommendationId: string;
    action: OptimizationAction;
    reason?: string;
    performanceBefore?: Record<string, unknown>;
    performanceAfter?: Record<string, unknown>;
    projectId?: string;
  }): DbOptimizationHistory {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const id = generateId('oh');
      const now = getCurrentTimestamp();

      db.prepare(`
        INSERT INTO schema_optimization_history (id, project_id, recommendation_id, action, reason,
          performance_before, performance_after, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId || 'default',
        input.recommendationId,
        input.action,
        input.reason || null,
        input.performanceBefore ? JSON.stringify(input.performanceBefore) : null,
        input.performanceAfter ? JSON.stringify(input.performanceAfter) : null,
        now
      );

      return db.prepare('SELECT * FROM schema_optimization_history WHERE id = ?').get(id) as DbOptimizationHistory;
    });
  },

  getByRecommendation(recommendationId: string): DbOptimizationHistory[] {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      return db.prepare(
        'SELECT * FROM schema_optimization_history WHERE recommendation_id = ? ORDER BY created_at DESC'
      ).all(recommendationId) as DbOptimizationHistory[];
    });
  },

  getAcceptanceRate(projectId: string = 'default'): { accepted: number; rejected: number; rate: number } {
    return withTableCheck('schema-intelligence', () => {
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT action, COUNT(*) as count
        FROM schema_optimization_history
        WHERE project_id = ? AND action IN ('accepted', 'rejected')
        GROUP BY action
      `).all(projectId) as Array<{ action: string; count: number }>;

      let accepted = 0, rejected = 0;
      for (const row of rows) {
        if (row.action === 'accepted') accepted = row.count;
        if (row.action === 'rejected') rejected = row.count;
      }
      const total = accepted + rejected;
      return { accepted, rejected, rate: total > 0 ? accepted / total : 0 };
    });
  },
};
