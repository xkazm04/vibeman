/**
 * Schema Intelligence Engine
 *
 * AI-driven analysis layer that:
 * 1. Reads query patterns from the collector buffer
 * 2. Introspects the current SQLite schema (tables, columns, indexes)
 * 3. Sends patterns + schema to an LLM for optimization analysis
 * 4. Generates typed SchemaRecommendation objects with migration SQL + rollback
 * 5. Learns from accepted/rejected recommendations to improve future suggestions
 *
 * The engine is stateless — call `analyze()` to trigger a full cycle.
 */

import { getDatabase } from '@/app/db/connection';
import {
  queryPatternRepository,
  schemaRecommendationRepository,
  optimizationHistoryRepository,
  type DbQueryPattern,
  type RecommendationCategory,
  type RecommendationSeverity,
} from '@/app/db/repositories/schema-intelligence.repository';
import { generateWithLLM } from '@/lib/llm';

// ─── Schema Introspection ─────────────────────────────────────────

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string | null;
  }>;
  rowCount: number;
}

interface IndexInfo {
  name: string;
  tableName: string;
  columns: string[];
  unique: boolean;
}

function introspectSchema(): { tables: TableSchema[]; indexes: IndexInfo[] } {
  const db = getDatabase();

  // Get all tables
  const tableRows = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>;

  const tables: TableSchema[] = [];
  for (const { name } of tableRows) {
    const columns = db.prepare(`PRAGMA table_info("${name}")`).all() as Array<{
      name: string; type: string; notnull: number; pk: number; dflt_value: string | null;
    }>;

    let rowCount = 0;
    try {
      const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM "${name}"`).get() as { cnt: number };
      rowCount = countRow.cnt;
    } catch {
      // Table might not exist in current state
    }

    tables.push({ name, columns, rowCount });
  }

  // Get all indexes
  const indexRows = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all() as Array<{ name: string; tbl_name: string }>;

  const indexes: IndexInfo[] = [];
  for (const { name, tbl_name } of indexRows) {
    const indexInfo = db.prepare(`PRAGMA index_info("${name}")`).all() as Array<{
      seqno: number; cid: number; name: string;
    }>;
    const indexList = db.prepare(`PRAGMA index_list("${tbl_name}")`).all() as Array<{
      name: string; unique: number;
    }>;

    const isUnique = indexList.find(i => i.name === name)?.unique === 1;

    indexes.push({
      name,
      tableName: tbl_name,
      columns: indexInfo.map(i => i.name),
      unique: isUnique || false,
    });
  }

  return { tables, indexes };
}

// ─── Schema Summary (compact format for LLM) ─────────────────────

function formatSchemaForPrompt(tables: TableSchema[], indexes: IndexInfo[]): string {
  const lines: string[] = [];

  // Group indexes by table
  const indexesByTable = new Map<string, IndexInfo[]>();
  for (const idx of indexes) {
    const list = indexesByTable.get(idx.tableName) || [];
    list.push(idx);
    indexesByTable.set(idx.tableName, list);
  }

  for (const table of tables) {
    lines.push(`TABLE ${table.name} (${table.rowCount} rows):`);
    for (const col of table.columns) {
      const pk = col.pk ? ' PK' : '';
      const nn = col.notnull ? ' NOT NULL' : '';
      lines.push(`  ${col.name} ${col.type}${pk}${nn}`);
    }

    const tableIndexes = indexesByTable.get(table.name);
    if (tableIndexes && tableIndexes.length > 0) {
      lines.push(`  INDEXES:`);
      for (const idx of tableIndexes) {
        const unique = idx.unique ? 'UNIQUE ' : '';
        lines.push(`    ${unique}${idx.name} ON (${idx.columns.join(', ')})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Query Pattern Summary ────────────────────────────────────────

function formatPatternsForPrompt(patterns: DbQueryPattern[]): string {
  if (patterns.length === 0) return 'No query patterns recorded yet.';

  const lines: string[] = [];
  for (const p of patterns.slice(0, 40)) {
    const tables = JSON.parse(p.table_names) as string[];
    lines.push(
      `[${p.operation_type.toUpperCase()}] ${p.execution_count}x, avg=${p.avg_duration_ms.toFixed(1)}ms, max=${p.max_duration_ms.toFixed(1)}ms`
    );
    lines.push(`  Tables: ${tables.join(', ')}`);
    lines.push(`  Template: ${p.query_template.slice(0, 200)}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ─── AI Analysis ──────────────────────────────────────────────────

interface AIRecommendation {
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  affected_tables: string[];
  migration_sql: string;
  rollback_sql: string;
  impact_analysis: string;
  risk_assessment: string;
  expected_improvement: string;
  confidence: number;
}

async function analyzeWithAI(
  schemaText: string,
  patternsText: string,
  learningContext: string,
): Promise<AIRecommendation[]> {
  const systemPrompt = `You are a senior database performance engineer analyzing an SQLite database schema against real query execution patterns. Your goal is to identify concrete optimization opportunities.

You MUST respond with a valid JSON array of recommendation objects. Each object must have these exact fields:
- category: one of "missing_index" | "denormalization" | "column_type" | "dead_table" | "query_optimization" | "schema_cleanup"
- severity: one of "critical" | "high" | "medium" | "low" | "info"
- title: brief 5-10 word summary
- description: 2-3 sentence explanation of the problem and proposed solution
- affected_tables: array of table names affected
- migration_sql: valid SQLite DDL/DML to apply the optimization
- rollback_sql: valid SQLite DDL/DML to reverse the optimization
- impact_analysis: expected performance impact in concrete terms
- risk_assessment: what could go wrong, data safety concerns
- expected_improvement: e.g. "2-5x faster for context lookups"
- confidence: 0-1 score of how confident you are in this recommendation

Focus on:
1. Missing indexes for frequently-queried columns (especially WHERE, JOIN, ORDER BY clauses)
2. Tables with zero rows that may be dead/unused
3. Queries scanning full tables that could benefit from indexes
4. Denormalization opportunities for expensive JOINs
5. Column type mismatches (e.g., storing integers as TEXT)

Do NOT recommend:
- Changes to SQLite internals or PRAGMA settings
- Changes to tables with fewer than 5 queries
- Dropping tables that are clearly part of the schema definition

If there are no actionable recommendations, return an empty array [].`;

  const prompt = `## Current Database Schema
${schemaText}

## Query Execution Patterns (top by frequency and latency)
${patternsText}

## Learning Context (past accepted/rejected recommendations)
${learningContext}

Analyze the schema against the query patterns and produce your JSON array of recommendations. Only include high-confidence, impactful recommendations.`;

  try {
    const response = await generateWithLLM(prompt, {
      systemPrompt,
      taskType: 'schema-intelligence',
      taskDescription: 'Analyze database schema for optimization opportunities',
      temperature: 0.3,
      maxTokens: 4000,
    });

    if (!response.success || !response.response) {
      console.error('[SchemaIntelligence] LLM generation failed:', response.error);
      return [];
    }

    // Parse JSON from response
    const jsonMatch = response.response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[SchemaIntelligence] No JSON array found in LLM response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
    if (!Array.isArray(parsed)) return [];

    // Validate each recommendation
    const validCategories = new Set(['missing_index', 'denormalization', 'column_type', 'dead_table', 'query_optimization', 'schema_cleanup']);
    const validSeverities = new Set(['critical', 'high', 'medium', 'low', 'info']);

    return parsed.filter(r =>
      validCategories.has(r.category) &&
      validSeverities.has(r.severity) &&
      r.title && r.description && Array.isArray(r.affected_tables)
    );
  } catch (error) {
    console.error('[SchemaIntelligence] Analysis error:', error);
    return [];
  }
}

// ─── Learning Context ─────────────────────────────────────────────

function buildLearningContext(projectId: string): string {
  const { accepted, rejected, rate } = optimizationHistoryRepository.getAcceptanceRate(projectId);

  if (accepted + rejected === 0) {
    return 'No previous recommendations have been evaluated yet.';
  }

  const lines: string[] = [
    `Acceptance rate: ${(rate * 100).toFixed(0)}% (${accepted} accepted, ${rejected} rejected)`,
  ];

  // Get recently rejected recommendations to learn from
  const rejectedRecs = schemaRecommendationRepository.getByStatus('rejected', projectId);
  if (rejectedRecs.length > 0) {
    lines.push('');
    lines.push('Recently REJECTED recommendations (avoid similar suggestions):');
    for (const rec of rejectedRecs.slice(0, 5)) {
      const history = optimizationHistoryRepository.getByRecommendation(rec.id);
      const reason = history.find(h => h.action === 'rejected')?.reason;
      lines.push(`  - [${rec.category}] ${rec.title}${reason ? ` (Reason: ${reason})` : ''}`);
    }
  }

  // Get recently accepted recommendations for positive signals
  const acceptedRecs = schemaRecommendationRepository.getByStatus('accepted', projectId);
  if (acceptedRecs.length > 0) {
    lines.push('');
    lines.push('Recently ACCEPTED recommendations (more like these):');
    for (const rec of acceptedRecs.slice(0, 5)) {
      lines.push(`  - [${rec.category}] ${rec.title}`);
    }
  }

  return lines.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────

export const schemaIntelligenceEngine = {
  /**
   * Run a full analysis cycle:
   * 1. Introspect schema
   * 2. Read query patterns
   * 3. Build learning context
   * 4. Call LLM for analysis
   * 5. Store recommendations
   *
   * Returns the number of new recommendations generated.
   */
  async analyze(projectId: string = 'default'): Promise<{
    recommendationsGenerated: number;
    patternsAnalyzed: number;
    tablesIntrospected: number;
  }> {
    // 1. Introspect current schema
    const { tables, indexes } = introspectSchema();
    const schemaText = formatSchemaForPrompt(tables, indexes);

    // 2. Get query patterns (top by frequency + top by latency)
    const byFrequency = queryPatternRepository.getTopByFrequency(projectId, 30);
    const bySlowest = queryPatternRepository.getTopBySlowest(projectId, 20);

    // Merge and deduplicate
    const seen = new Set<string>();
    const patterns: DbQueryPattern[] = [];
    for (const p of [...byFrequency, ...bySlowest]) {
      if (!seen.has(p.query_hash)) {
        seen.add(p.query_hash);
        patterns.push(p);
      }
    }

    if (patterns.length === 0) {
      return { recommendationsGenerated: 0, patternsAnalyzed: 0, tablesIntrospected: tables.length };
    }

    const patternsText = formatPatternsForPrompt(patterns);

    // 3. Build learning context from history
    const learningContext = buildLearningContext(projectId);

    // 4. Run AI analysis
    const aiRecommendations = await analyzeWithAI(schemaText, patternsText, learningContext);

    // 5. Store recommendations
    let created = 0;
    for (const rec of aiRecommendations) {
      // Check for duplicate recommendations (same title + category)
      const existing = schemaRecommendationRepository.getAll(projectId);
      const isDuplicate = existing.some(
        e => e.title === rec.title && e.category === rec.category && e.status === 'pending'
      );

      if (!isDuplicate) {
        schemaRecommendationRepository.create({
          category: rec.category,
          severity: rec.severity,
          title: rec.title,
          description: rec.description,
          affectedTables: rec.affected_tables,
          migrationSql: rec.migration_sql,
          rollbackSql: rec.rollback_sql,
          impactAnalysis: rec.impact_analysis,
          riskAssessment: rec.risk_assessment,
          expectedImprovement: rec.expected_improvement,
          sourceQueryPatterns: patterns.slice(0, 10).map(p => p.id),
          aiConfidence: rec.confidence,
          projectId,
        });
        created++;
      }
    }

    return {
      recommendationsGenerated: created,
      patternsAnalyzed: patterns.length,
      tablesIntrospected: tables.length,
    };
  },

  /**
   * Accept a recommendation — records in history for learning.
   */
  accept(recommendationId: string, reason?: string, projectId: string = 'default'): void {
    schemaRecommendationRepository.updateStatus(recommendationId, 'accepted');
    optimizationHistoryRepository.record({
      recommendationId,
      action: 'accepted',
      reason,
      projectId,
    });
  },

  /**
   * Reject a recommendation — records in history so future analyses avoid similar suggestions.
   */
  reject(recommendationId: string, reason?: string, projectId: string = 'default'): void {
    schemaRecommendationRepository.updateStatus(recommendationId, 'rejected');
    optimizationHistoryRepository.record({
      recommendationId,
      action: 'rejected',
      reason,
      projectId,
    });
  },

  /**
   * Apply a recommendation — executes the migration SQL.
   */
  apply(recommendationId: string, projectId: string = 'default'): { success: boolean; error?: string } {
    const rec = schemaRecommendationRepository.getById(recommendationId);
    if (!rec) return { success: false, error: 'Recommendation not found' };
    if (!rec.migration_sql) return { success: false, error: 'No migration SQL provided' };

    const db = getDatabase();

    // Capture pre-application state
    const patternStats = queryPatternRepository.getStats(projectId);

    try {
      db.exec(rec.migration_sql);

      schemaRecommendationRepository.updateStatus(recommendationId, 'applied');
      optimizationHistoryRepository.record({
        recommendationId,
        action: 'applied',
        performanceBefore: {
          avgDurationMs: patternStats.avgDurationMs,
          totalPatterns: patternStats.totalPatterns,
        },
        projectId,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Rollback an applied recommendation.
   */
  rollback(recommendationId: string, projectId: string = 'default'): { success: boolean; error?: string } {
    const rec = schemaRecommendationRepository.getById(recommendationId);
    if (!rec) return { success: false, error: 'Recommendation not found' };
    if (!rec.rollback_sql) return { success: false, error: 'No rollback SQL provided' };
    if (rec.status !== 'applied') return { success: false, error: 'Recommendation has not been applied' };

    const db = getDatabase();

    try {
      db.exec(rec.rollback_sql);

      schemaRecommendationRepository.updateStatus(recommendationId, 'rolled_back');
      optimizationHistoryRepository.record({
        recommendationId,
        action: 'rolled_back',
        projectId,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Get a full dashboard summary of schema intelligence state.
   */
  getDashboard(projectId: string = 'default') {
    const patternStats = queryPatternRepository.getStats(projectId);
    const recSummary = schemaRecommendationRepository.getSummary(projectId);
    const acceptanceRate = optimizationHistoryRepository.getAcceptanceRate(projectId);
    const pendingRecs = schemaRecommendationRepository.getPending(projectId);
    const topSlowest = queryPatternRepository.getTopBySlowest(projectId, 5);
    const topFrequent = queryPatternRepository.getTopByFrequency(projectId, 5);

    return {
      queryPatterns: patternStats,
      recommendations: recSummary,
      acceptanceRate,
      pendingRecommendations: pendingRecs,
      slowestQueries: topSlowest,
      mostFrequentQueries: topFrequent,
    };
  },

  /**
   * Introspect the current schema (exposed for API use).
   */
  introspect() {
    return introspectSchema();
  },
};
