/**
 * Query Performance Profiler
 *
 * Analyzes collected query patterns from the queryPatternCollector to produce
 * actionable performance insights. Surfaces:
 * - Top slowest query templates with avg/p95 durations
 * - Tables with high write contention (from hot-writes stats)
 * - Missing index suggestions based on frequent full-table scans
 * - Correlates slow queries with API routes via obs_api_calls
 */

import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { queryPatternRepository, DbQueryPattern } from '@/app/db/repositories/schema-intelligence.repository';
import { withTableCheck, safeParseJsonArray } from '@/app/db/repositories/repository.utils';
import { queryPatternCollector } from '@/lib/db/queryPatternCollector';

// ─── Types ────────────────────────────────────────────────────────

export interface SlowQuery {
  queryHash: string;
  queryTemplate: string;
  tableNames: string[];
  operationType: string;
  executionCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  lastExecutedAt: string;
  firstSeenAt: string;
}

export interface TableContention {
  tableName: string;
  writeCount: number;
  readCount: number;
  writeRatio: number;
  avgWriteDurationMs: number;
  avgReadDurationMs: number;
  hotness: 'critical' | 'high' | 'medium' | 'low';
}

export interface IndexSuggestion {
  tableName: string;
  reason: string;
  suggestedColumns: string[];
  estimatedImpact: string;
  queryPatternCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RouteCorrelation {
  endpoint: string;
  method: string;
  totalCalls: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  errorRate: number;
  estimatedDbLoad: number; // percentage of total DB time attributable
}

export interface PerformanceOverview {
  totalPatterns: number;
  totalExecutions: number;
  avgDurationMs: number;
  slowestQueryMs: number;
  p95DurationMs: number;
  queriesPerSecond: number;
  collectorBufferSize: number;
}

export interface PerformanceProfileResult {
  overview: PerformanceOverview;
  slowQueries: SlowQuery[];
  tableContention: TableContention[];
  indexSuggestions: IndexSuggestion[];
  routeCorrelations: RouteCorrelation[];
  analyzedAt: string;
}

// ─── Profiler ─────────────────────────────────────────────────────

function mapPattern(p: DbQueryPattern): SlowQuery {
  return {
    queryHash: p.query_hash,
    queryTemplate: p.query_template,
    tableNames: safeParseJsonArray<string>(p.table_names),
    operationType: p.operation_type,
    executionCount: p.execution_count,
    avgDurationMs: Math.round(p.avg_duration_ms * 100) / 100,
    maxDurationMs: Math.round(p.max_duration_ms * 100) / 100,
    totalDurationMs: Math.round(p.total_duration_ms * 100) / 100,
    lastExecutedAt: p.last_executed_at,
    firstSeenAt: p.first_seen_at,
  };
}

/**
 * Get top N slowest queries by average duration.
 */
function getSlowQueries(projectId: string, limit: number): SlowQuery[] {
  const patterns = queryPatternRepository.getTopBySlowest(projectId, limit);
  return patterns.map(mapPattern);
}

/**
 * Analyze table write contention by aggregating query patterns
 * per table and operation type.
 */
function analyzeTableContention(projectId: string): TableContention[] {
  return withTableCheck('schema-intelligence', () => {
    const db = getDatabase();

    const patterns = db.prepare(`
      SELECT * FROM query_patterns
      WHERE project_id = ? AND execution_count >= 2
      ORDER BY execution_count DESC
    `).all(projectId) as DbQueryPattern[];

    // Aggregate per table
    const tableMap = new Map<string, {
      writes: number; reads: number;
      writeDuration: number; readDuration: number;
      writeCount: number; readCount: number;
    }>();

    for (const p of patterns) {
      const tables = safeParseJsonArray<string>(p.table_names);
      const isWrite = p.operation_type !== 'select';

      for (const table of tables) {
        const entry = tableMap.get(table) || {
          writes: 0, reads: 0,
          writeDuration: 0, readDuration: 0,
          writeCount: 0, readCount: 0,
        };

        if (isWrite) {
          entry.writes += p.execution_count;
          entry.writeDuration += p.total_duration_ms;
          entry.writeCount++;
        } else {
          entry.reads += p.execution_count;
          entry.readDuration += p.total_duration_ms;
          entry.readCount++;
        }

        tableMap.set(table, entry);
      }
    }

    const results: TableContention[] = [];
    for (const [tableName, stats] of tableMap) {
      const total = stats.writes + stats.reads;
      if (total < 5) continue; // skip low-traffic tables

      const writeRatio = total > 0 ? stats.writes / total : 0;
      let hotness: TableContention['hotness'] = 'low';
      if (writeRatio > 0.8 && stats.writes > 100) hotness = 'critical';
      else if (writeRatio > 0.6 && stats.writes > 50) hotness = 'high';
      else if (writeRatio > 0.4 && stats.writes > 20) hotness = 'medium';

      results.push({
        tableName,
        writeCount: stats.writes,
        readCount: stats.reads,
        writeRatio: Math.round(writeRatio * 100) / 100,
        avgWriteDurationMs: stats.writeCount > 0
          ? Math.round((stats.writeDuration / stats.writes) * 100) / 100
          : 0,
        avgReadDurationMs: stats.readCount > 0
          ? Math.round((stats.readDuration / stats.reads) * 100) / 100
          : 0,
        hotness,
      });
    }

    return results.sort((a, b) => b.writeRatio - a.writeRatio || b.writeCount - a.writeCount);
  });
}

/**
 * Suggest missing indexes based on frequently executed queries
 * that do full-table scans (high execution count + slow avg duration).
 */
function suggestMissingIndexes(projectId: string): IndexSuggestion[] {
  return withTableCheck('schema-intelligence', () => {
    const db = getDatabase();
    const suggestions: IndexSuggestion[] = [];

    // Get existing indexes
    const existingIndexes = db.prepare(
      "SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'index'"
    ).all() as Array<{ name: string; tbl_name: string; sql: string | null }>;

    const indexedColumns = new Map<string, Set<string>>();
    for (const idx of existingIndexes) {
      if (!idx.sql) continue;
      const colMatch = idx.sql.match(/\(([^)]+)\)/);
      if (colMatch) {
        const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase().replace(/^"(.*)"$/, '$1'));
        const existing = indexedColumns.get(idx.tbl_name) || new Set();
        cols.forEach(c => existing.add(c));
        indexedColumns.set(idx.tbl_name, existing);
      }
    }

    // Analyze slow, frequent queries for index opportunities
    const patterns = db.prepare(`
      SELECT * FROM query_patterns
      WHERE project_id = ? AND operation_type = 'select' AND execution_count >= 5
      ORDER BY (avg_duration_ms * execution_count) DESC
      LIMIT 50
    `).all(projectId) as DbQueryPattern[];

    for (const p of patterns) {
      const tables = safeParseJsonArray<string>(p.table_names);
      const template = p.query_template.toLowerCase();

      // Extract WHERE clause columns
      const whereMatch = template.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s*$)/i);
      if (!whereMatch) continue;

      const whereCols = extractWhereColumns(whereMatch[1]);
      if (whereCols.length === 0) continue;

      for (const table of tables) {
        const indexed = indexedColumns.get(table) || new Set();
        const unindexed = whereCols.filter(c => !indexed.has(c) && c !== '?');

        if (unindexed.length > 0) {
          // Calculate severity based on execution count and duration
          let severity: IndexSuggestion['severity'] = 'low';
          const impact = p.avg_duration_ms * p.execution_count;
          if (impact > 10000) severity = 'critical';
          else if (impact > 1000) severity = 'high';
          else if (impact > 100) severity = 'medium';

          suggestions.push({
            tableName: table,
            reason: `Query executed ${p.execution_count}x with avg ${p.avg_duration_ms.toFixed(1)}ms lacks index on WHERE columns`,
            suggestedColumns: unindexed,
            estimatedImpact: impact > 1000 ? 'High — significant query time reduction expected' :
                             impact > 100 ? 'Medium — moderate improvement possible' :
                             'Low — minor optimization',
            queryPatternCount: p.execution_count,
            severity,
          });
        }
      }
    }

    // Deduplicate by table + columns
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = `${s.tableName}:${s.suggestedColumns.sort().join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  });
}

/**
 * Extract column names from a WHERE clause.
 */
function extractWhereColumns(whereClause: string): string[] {
  const cols: string[] = [];
  // Match column = ?, column IN (?), column LIKE ?, column > ?, etc.
  const matches = whereClause.matchAll(/([a-z_][a-z0-9_]*)\s*(?:=|!=|<>|>=?|<=?|like|in|is)\s/gi);
  for (const m of matches) {
    const col = m[1].toLowerCase();
    // Filter out SQL keywords
    if (!['and', 'or', 'not', 'null', 'true', 'false', 'between'].includes(col)) {
      cols.push(col);
    }
  }
  return [...new Set(cols)];
}

/**
 * Correlate slow queries with API routes via obs_api_calls data.
 */
function getRouteCorrelations(projectId: string, limit: number): RouteCorrelation[] {
  try {
    const hotDb = getHotWritesDatabase();

    // Get endpoint stats from hot-writes DB
    const routes = hotDb.prepare(`
      SELECT
        endpoint,
        method,
        COUNT(*) as total_calls,
        AVG(response_time_ms) as avg_response_time_ms,
        MAX(response_time_ms) as max_response_time_ms,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM obs_api_calls
      WHERE project_id = ?
      GROUP BY endpoint, method
      ORDER BY avg_response_time_ms DESC
      LIMIT ?
    `).all(projectId, limit) as Array<{
      endpoint: string;
      method: string;
      total_calls: number;
      avg_response_time_ms: number | null;
      max_response_time_ms: number | null;
      error_count: number;
    }>;

    // Get total DB time from query patterns for load estimation
    const stats = queryPatternRepository.getStats(projectId);
    const totalDbTimeMs = stats.totalExecutions * stats.avgDurationMs;

    return routes.map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      totalCalls: r.total_calls,
      avgResponseTimeMs: Math.round((r.avg_response_time_ms || 0) * 100) / 100,
      maxResponseTimeMs: Math.round((r.max_response_time_ms || 0) * 100) / 100,
      errorRate: r.total_calls > 0 ? Math.round((r.error_count / r.total_calls) * 10000) / 100 : 0,
      estimatedDbLoad: totalDbTimeMs > 0
        ? Math.round(((r.avg_response_time_ms || 0) * r.total_calls / totalDbTimeMs) * 10000) / 100
        : 0,
    }));
  } catch {
    // Hot-writes DB may not be initialized
    return [];
  }
}

/**
 * Calculate approximate P95 from query patterns.
 * Since we don't store individual query durations, we estimate
 * from the max_duration_ms of the top 5% heaviest patterns.
 */
function estimateP95(projectId: string): number {
  return withTableCheck('schema-intelligence', () => {
    const db = getDatabase();
    const total = db.prepare(
      'SELECT COUNT(*) as cnt FROM query_patterns WHERE project_id = ?'
    ).get(projectId) as { cnt: number };

    if (total.cnt === 0) return 0;

    const top5pctIndex = Math.max(1, Math.ceil(total.cnt * 0.05));

    const row = db.prepare(`
      SELECT max_duration_ms FROM query_patterns
      WHERE project_id = ?
      ORDER BY max_duration_ms DESC
      LIMIT 1 OFFSET ?
    `).get(projectId, top5pctIndex - 1) as { max_duration_ms: number } | undefined;

    return row ? Math.round(row.max_duration_ms * 100) / 100 : 0;
  });
}

/**
 * Main profiler entry point — gathers all performance metrics.
 */
export function profileQueryPerformance(
  projectId: string = 'default',
  options: { slowQueryLimit?: number; routeLimit?: number } = {}
): PerformanceProfileResult {
  const { slowQueryLimit = 10, routeLimit = 15 } = options;

  const stats = queryPatternRepository.getStats(projectId);
  const p95 = estimateP95(projectId);

  // Estimate queries/second from total executions and time range
  let queriesPerSecond = 0;
  try {
    const db = getDatabase();
    const range = db.prepare(`
      SELECT
        MIN(first_seen_at) as earliest,
        MAX(last_executed_at) as latest
      FROM query_patterns WHERE project_id = ?
    `).get(projectId) as { earliest: string | null; latest: string | null };

    if (range.earliest && range.latest) {
      const spanMs = new Date(range.latest).getTime() - new Date(range.earliest).getTime();
      if (spanMs > 0) {
        queriesPerSecond = Math.round((stats.totalExecutions / (spanMs / 1000)) * 100) / 100;
      }
    }
  } catch { /* ignore */ }

  // Get collector buffer stats
  let bufferSize = 0;
  try {
    bufferSize = queryPatternCollector.getBufferStats().size;
  } catch { /* ignore */ }

  return {
    overview: {
      totalPatterns: stats.totalPatterns,
      totalExecutions: stats.totalExecutions,
      avgDurationMs: Math.round(stats.avgDurationMs * 100) / 100,
      slowestQueryMs: Math.round(stats.slowestQueryMs * 100) / 100,
      p95DurationMs: p95,
      queriesPerSecond,
      collectorBufferSize: bufferSize,
    },
    slowQueries: getSlowQueries(projectId, slowQueryLimit),
    tableContention: analyzeTableContention(projectId),
    indexSuggestions: suggestMissingIndexes(projectId),
    routeCorrelations: getRouteCorrelations(projectId, routeLimit),
    analyzedAt: new Date().toISOString(),
  };
}
