/**
 * Write-Frequency Monitor
 *
 * Samples INSERT/UPDATE rates per table from the query pattern collector,
 * flags tables exceeding a configurable threshold, and proposes:
 * - Promoting hot tables to hot-writes.db
 * - Demoting cooled-down tables back to main DB
 *
 * Uses the existing query_patterns table as its data source — no new
 * instrumentation needed.
 */

import { getDatabase } from '@/app/db/connection';
import { withTableCheck } from '@/app/db/repositories/repository.utils';

// ─── Configuration ───────────────────────────────────────────────

export interface WriteFrequencyConfig {
  /** Writes/min above which a table is considered "hot" (default: 50) */
  promotionThreshold: number;
  /** Writes/min below which a hot table is considered "cool" (default: 5) */
  demotionThreshold: number;
  /** Minimum observation window in hours before making recommendations (default: 1) */
  minObservationHours: number;
  /** Minimum total write count before a table is eligible for promotion (default: 100) */
  minWriteCount: number;
}

const DEFAULT_CONFIG: WriteFrequencyConfig = {
  promotionThreshold: 50,
  demotionThreshold: 5,
  minObservationHours: 1,
  minWriteCount: 100,
};

// Tables currently in hot-writes.db — the static baseline
const HOT_WRITES_TABLES = new Set(['behavioral_signals', 'obs_api_calls']);

// Tables that should never be moved (internal/system tables)
const EXCLUDED_TABLES = new Set([
  'query_patterns',
  'schema_recommendations',
  'schema_optimization_history',
  'write_frequency_snapshots',
]);

// ─── Types ───────────────────────────────────────────────────────

export interface TableWriteStats {
  tableName: string;
  writeCount: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  avgWriteDurationMs: number;
  firstSeenAt: string;
  lastWriteAt: string;
  /** Estimated writes per minute based on observation window */
  writesPerMinute: number;
  /** Whether this table currently lives in hot-writes.db */
  isHot: boolean;
}

export type PromotionAction = 'promote' | 'demote';

export interface PromotionRecommendation {
  tableName: string;
  action: PromotionAction;
  reason: string;
  writesPerMinute: number;
  threshold: number;
  writeCount: number;
  confidence: number;
}

export interface WriteFrequencySnapshot {
  id: string;
  tableName: string;
  writesPerMinute: number;
  writeCount: number;
  snapshotAt: string;
}

export interface MonitorResult {
  stats: TableWriteStats[];
  recommendations: PromotionRecommendation[];
  config: WriteFrequencyConfig;
  snapshotSaved: boolean;
}

// ─── Snapshot Persistence ────────────────────────────────────────

function ensureSnapshotTable(): void {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS write_frequency_snapshots (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      writes_per_minute REAL NOT NULL,
      write_count INTEGER NOT NULL,
      snapshot_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_wfs_table ON write_frequency_snapshots(table_name);
    CREATE INDEX IF NOT EXISTS idx_wfs_time ON write_frequency_snapshots(snapshot_at);
  `);
}

function saveSnapshot(stats: TableWriteStats[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO write_frequency_snapshots (id, table_name, writes_per_minute, write_count, snapshot_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const s of stats) {
      if (s.writeCount > 0) {
        const id = `wfs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${s.tableName}`;
        insert.run(id, s.tableName, s.writesPerMinute, s.writeCount, now);
      }
    }
  });
  tx();
}

function pruneOldSnapshots(retentionDays: number = 7): number {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
  const result = db.prepare(
    'DELETE FROM write_frequency_snapshots WHERE snapshot_at < ?'
  ).run(cutoff);
  return result.changes;
}

// ─── Core Analysis ───────────────────────────────────────────────

function getTableWriteStats(projectId: string): TableWriteStats[] {
  return withTableCheck('write-frequency-monitor', () => {
    const db = getDatabase();

    // Query write patterns grouped by table from query_patterns
    const rows = db.prepare(`
      SELECT
        qp.table_names,
        qp.operation_type,
        qp.execution_count,
        qp.avg_duration_ms,
        qp.first_seen_at,
        qp.last_executed_at
      FROM query_patterns qp
      WHERE qp.project_id = ?
        AND qp.operation_type IN ('insert', 'update', 'delete')
      ORDER BY qp.execution_count DESC
    `).all(projectId) as Array<{
      table_names: string;
      operation_type: string;
      execution_count: number;
      avg_duration_ms: number;
      first_seen_at: string;
      last_executed_at: string;
    }>;

    // Aggregate by table name
    const tableMap = new Map<string, {
      writeCount: number;
      insertCount: number;
      updateCount: number;
      deleteCount: number;
      totalDurationMs: number;
      totalOps: number;
      firstSeen: string;
      lastWrite: string;
    }>();

    for (const row of rows) {
      let tables: string[];
      try {
        tables = JSON.parse(row.table_names) as string[];
      } catch {
        continue;
      }

      for (const table of tables) {
        if (EXCLUDED_TABLES.has(table)) continue;

        const existing = tableMap.get(table) || {
          writeCount: 0,
          insertCount: 0,
          updateCount: 0,
          deleteCount: 0,
          totalDurationMs: 0,
          totalOps: 0,
          firstSeen: row.first_seen_at,
          lastWrite: row.last_executed_at,
        };

        existing.writeCount += row.execution_count;
        existing.totalDurationMs += row.avg_duration_ms * row.execution_count;
        existing.totalOps += row.execution_count;

        if (row.operation_type === 'insert') existing.insertCount += row.execution_count;
        if (row.operation_type === 'update') existing.updateCount += row.execution_count;
        if (row.operation_type === 'delete') existing.deleteCount += row.execution_count;

        if (row.first_seen_at < existing.firstSeen) existing.firstSeen = row.first_seen_at;
        if (row.last_executed_at > existing.lastWrite) existing.lastWrite = row.last_executed_at;

        tableMap.set(table, existing);
      }
    }

    // Convert to TableWriteStats with writes/minute calculation
    const stats: TableWriteStats[] = [];
    for (const [tableName, data] of tableMap) {
      const firstSeen = new Date(data.firstSeen).getTime();
      const lastWrite = new Date(data.lastWrite).getTime();
      const windowMs = Math.max(lastWrite - firstSeen, 60_000); // Min 1 minute window
      const windowMinutes = windowMs / 60_000;

      stats.push({
        tableName,
        writeCount: data.writeCount,
        insertCount: data.insertCount,
        updateCount: data.updateCount,
        deleteCount: data.deleteCount,
        avgWriteDurationMs: data.totalOps > 0 ? data.totalDurationMs / data.totalOps : 0,
        firstSeenAt: data.firstSeen,
        lastWriteAt: data.lastWrite,
        writesPerMinute: data.writeCount / windowMinutes,
        isHot: HOT_WRITES_TABLES.has(tableName),
      });
    }

    // Sort by writes/minute descending
    stats.sort((a, b) => b.writesPerMinute - a.writesPerMinute);
    return stats;
  });
}

function generateRecommendations(
  stats: TableWriteStats[],
  config: WriteFrequencyConfig,
): PromotionRecommendation[] {
  const recommendations: PromotionRecommendation[] = [];

  for (const s of stats) {
    // Check observation window
    const firstSeen = new Date(s.firstSeenAt).getTime();
    const windowHours = (Date.now() - firstSeen) / (1000 * 60 * 60);
    if (windowHours < config.minObservationHours) continue;

    if (!s.isHot && s.writesPerMinute >= config.promotionThreshold && s.writeCount >= config.minWriteCount) {
      // Promotion candidate
      const confidence = Math.min(
        1,
        (s.writesPerMinute / config.promotionThreshold) * 0.5 +
        (s.writeCount / (config.minWriteCount * 10)) * 0.3 +
        (windowHours / 24) * 0.2
      );

      recommendations.push({
        tableName: s.tableName,
        action: 'promote',
        reason: `Table "${s.tableName}" averages ${s.writesPerMinute.toFixed(1)} writes/min (threshold: ${config.promotionThreshold}). ` +
          `Total writes: ${s.writeCount}. Moving to hot-writes.db would reduce main DB write contention.`,
        writesPerMinute: s.writesPerMinute,
        threshold: config.promotionThreshold,
        writeCount: s.writeCount,
        confidence: Math.round(confidence * 100) / 100,
      });
    } else if (s.isHot && s.writesPerMinute < config.demotionThreshold && s.writeCount >= config.minWriteCount) {
      // Demotion candidate
      const confidence = Math.min(
        1,
        (1 - s.writesPerMinute / config.demotionThreshold) * 0.5 +
        (windowHours / 48) * 0.3 +
        0.2 // base confidence for having enough data
      );

      recommendations.push({
        tableName: s.tableName,
        action: 'demote',
        reason: `Table "${s.tableName}" has cooled to ${s.writesPerMinute.toFixed(1)} writes/min (threshold: ${config.demotionThreshold}). ` +
          `It can be moved back to goals.db to simplify the architecture.`,
        writesPerMinute: s.writesPerMinute,
        threshold: config.demotionThreshold,
        writeCount: s.writeCount,
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  // Sort by confidence descending
  recommendations.sort((a, b) => b.confidence - a.confidence);
  return recommendations;
}

// ─── Historical Trend ────────────────────────────────────────────

export interface TableTrend {
  tableName: string;
  snapshots: Array<{
    writesPerMinute: number;
    writeCount: number;
    snapshotAt: string;
  }>;
  trend: 'rising' | 'stable' | 'falling';
}

function getTableTrends(tableName?: string, days: number = 7): TableTrend[] {
  return withTableCheck('write-frequency-monitor', () => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const query = tableName
      ? 'SELECT * FROM write_frequency_snapshots WHERE table_name = ? AND snapshot_at > ? ORDER BY snapshot_at'
      : 'SELECT * FROM write_frequency_snapshots WHERE snapshot_at > ? ORDER BY table_name, snapshot_at';

    const rows = (tableName
      ? db.prepare(query).all(tableName, cutoff)
      : db.prepare(query).all(cutoff)
    ) as Array<{
      table_name: string;
      writes_per_minute: number;
      write_count: number;
      snapshot_at: string;
    }>;

    // Group by table
    const byTable = new Map<string, Array<{ writesPerMinute: number; writeCount: number; snapshotAt: string }>>();
    for (const row of rows) {
      const list = byTable.get(row.table_name) || [];
      list.push({
        writesPerMinute: row.writes_per_minute,
        writeCount: row.write_count,
        snapshotAt: row.snapshot_at,
      });
      byTable.set(row.table_name, list);
    }

    const trends: TableTrend[] = [];
    for (const [name, snapshots] of byTable) {
      let trend: 'rising' | 'stable' | 'falling' = 'stable';
      if (snapshots.length >= 2) {
        const first = snapshots[0].writesPerMinute;
        const last = snapshots[snapshots.length - 1].writesPerMinute;
        const change = first > 0 ? (last - first) / first : 0;
        if (change > 0.2) trend = 'rising';
        else if (change < -0.2) trend = 'falling';
      }
      trends.push({ tableName: name, snapshots, trend });
    }

    return trends;
  });
}

// ─── Public API ──────────────────────────────────────────────────

export const writeFrequencyMonitor = {
  /**
   * Run a full analysis cycle: gather stats, generate recommendations, save snapshot.
   */
  analyze(projectId: string = 'default', config?: Partial<WriteFrequencyConfig>): MonitorResult {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    ensureSnapshotTable();

    const stats = getTableWriteStats(projectId);
    const recommendations = generateRecommendations(stats, mergedConfig);

    // Save snapshot for trend analysis
    let snapshotSaved = false;
    try {
      saveSnapshot(stats);
      pruneOldSnapshots();
      snapshotSaved = true;
    } catch {
      // Non-fatal — snapshot persistence is best-effort
    }

    return { stats, recommendations, config: mergedConfig, snapshotSaved };
  },

  /**
   * Get write stats without generating recommendations or saving snapshots.
   */
  getStats(projectId: string = 'default'): TableWriteStats[] {
    return getTableWriteStats(projectId);
  },

  /**
   * Get historical trends for one or all tables.
   */
  getTrends(tableName?: string, days: number = 7): TableTrend[] {
    ensureSnapshotTable();
    return getTableTrends(tableName, days);
  },

  /**
   * Get the current hot-writes table set.
   */
  getHotTables(): string[] {
    return Array.from(HOT_WRITES_TABLES);
  },

  /**
   * Get the default configuration.
   */
  getDefaultConfig(): WriteFrequencyConfig {
    return { ...DEFAULT_CONFIG };
  },
};
