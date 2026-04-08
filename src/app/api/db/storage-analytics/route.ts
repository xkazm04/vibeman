/**
 * GET /api/db/storage-analytics
 *
 * Database size and table growth analytics endpoint.
 * Returns per-table disk usage estimates, row counts, growth trends,
 * and bloat flags for high-frequency write tables.
 *
 * Uses SQLite PRAGMA page_count and page_size for total DB size,
 * and samples table row counts for growth tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';

interface TableStats {
  name: string;
  rowCount: number;
  estimatedSizeBytes: number;
  database: 'main' | 'hot-writes';
  isHighFrequency: boolean;
}

interface DbSizeInfo {
  label: string;
  totalSizeBytes: number;
  pageSize: number;
  pageCount: number;
  freelistCount: number;
  walSizeBytes: number;
}

interface GrowthTrend {
  tableName: string;
  currentRows: number;
  growthRate: 'fast' | 'moderate' | 'slow' | 'static';
  bloatWarning: boolean;
}

interface StorageAnalyticsResponse {
  mainDb: DbSizeInfo;
  hotWritesDb: DbSizeInfo;
  tables: TableStats[];
  growthTrends: GrowthTrend[];
  totalSizeBytes: number;
  sampledAt: string;
}

const HIGH_FREQUENCY_TABLES = ['behavioral_signals', 'obs_api_calls'];

const MAIN_DB_TABLES = [
  'goals', 'contexts', 'context_groups', 'events', 'scans',
  'ideas', 'implementation_logs', 'tech_debt', 'scan_queue',
  'scan_notifications', 'file_watch_config', 'conductor_runs',
  'sessions', 'session_tasks', 'learning_insights', 'brain_reflections',
  'brain_insights', 'insight_annotations', 'obs_endpoint_stats',
  'questions', 'directions', 'direction_outcomes', 'hall_of_fame',
  'integrations', 'integration_events', 'webhooks', 'standups',
  'context_api_routes', 'goal_candidates', 'context_group_relationships',
  'query_patterns',
];

const HOT_WRITES_TABLES = ['behavioral_signals', 'obs_api_calls'];

function getRowCount(db: any, tableName: string): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
    return row?.count || 0;
  } catch {
    return -1; // table doesn't exist
  }
}

function getDbSize(db: any): Omit<DbSizeInfo, 'label'> {
  try {
    const pageSize = (db.pragma('page_size') as { page_size: number }[])[0]?.page_size || 4096;
    const pageCount = (db.pragma('page_count') as { page_count: number }[])[0]?.page_count || 0;
    const freelistCount = (db.pragma('freelist_count') as { freelist_count: number }[])[0]?.freelist_count || 0;

    // WAL size estimate: check wal_checkpoint for pages
    let walSizeBytes = 0;
    try {
      const walInfo = db.pragma('wal_checkpoint(PASSIVE)') as { busy: number; log: number; checkpointed: number }[];
      if (walInfo?.[0]) {
        walSizeBytes = (walInfo[0].log || 0) * pageSize;
      }
    } catch {
      // WAL may not be active
    }

    return {
      totalSizeBytes: pageCount * pageSize,
      pageSize,
      pageCount,
      freelistCount,
      walSizeBytes,
    };
  } catch {
    return { totalSizeBytes: 0, pageSize: 4096, pageCount: 0, freelistCount: 0, walSizeBytes: 0 };
  }
}

function estimateTableSize(db: any, tableName: string, totalDbSize: number, totalRows: number, tableRows: number): number {
  if (totalRows === 0 || tableRows <= 0) return 0;
  // Rough proportional estimate based on row count ratio
  return Math.round((tableRows / totalRows) * totalDbSize);
}

function classifyGrowthRate(rowCount: number, isHighFrequency: boolean): GrowthTrend['growthRate'] {
  if (isHighFrequency) {
    if (rowCount > 50000) return 'fast';
    if (rowCount > 10000) return 'moderate';
    return 'slow';
  }
  if (rowCount > 10000) return 'moderate';
  if (rowCount > 1000) return 'slow';
  return 'static';
}

async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const mainDb = getDatabase();
    const hotDb = getHotWritesDatabase();

    // Get DB sizes
    const mainSize = getDbSize(mainDb);
    const hotSize = getDbSize(hotDb);

    // Collect table stats
    const tables: TableStats[] = [];
    let mainTotalRows = 0;
    let hotTotalRows = 0;

    // Main DB tables
    for (const name of MAIN_DB_TABLES) {
      const rowCount = getRowCount(mainDb, name);
      if (rowCount < 0) continue; // table doesn't exist
      mainTotalRows += rowCount;
      tables.push({
        name,
        rowCount,
        estimatedSizeBytes: 0, // calculated after totals
        database: 'main',
        isHighFrequency: false,
      });
    }

    // Hot-writes DB tables
    for (const name of HOT_WRITES_TABLES) {
      const rowCount = getRowCount(hotDb, name);
      if (rowCount < 0) continue;
      hotTotalRows += rowCount;
      tables.push({
        name,
        rowCount,
        estimatedSizeBytes: 0,
        database: 'hot-writes',
        isHighFrequency: HIGH_FREQUENCY_TABLES.includes(name),
      });
    }

    // Calculate estimated sizes
    for (const table of tables) {
      if (table.database === 'main') {
        table.estimatedSizeBytes = estimateTableSize(
          mainDb, table.name, mainSize.totalSizeBytes, mainTotalRows, table.rowCount
        );
      } else {
        table.estimatedSizeBytes = estimateTableSize(
          hotDb, table.name, hotSize.totalSizeBytes, hotTotalRows, table.rowCount
        );
      }
    }

    // Sort by row count descending
    tables.sort((a, b) => b.rowCount - a.rowCount);

    // Growth trends
    const growthTrends: GrowthTrend[] = tables
      .filter(t => t.rowCount > 0)
      .map(t => ({
        tableName: t.name,
        currentRows: t.rowCount,
        growthRate: classifyGrowthRate(t.rowCount, t.isHighFrequency),
        bloatWarning: t.isHighFrequency && t.rowCount > 25000,
      }));

    const response: StorageAnalyticsResponse = {
      mainDb: { label: 'goals.db', ...mainSize },
      hotWritesDb: { label: 'hot-writes.db', ...hotSize },
      tables,
      growthTrends,
      totalSizeBytes: mainSize.totalSizeBytes + hotSize.totalSizeBytes,
      sampledAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to collect storage analytics: ${message}` },
      { status: 500 }
    );
  }
}

export const GET = createRouteHandler(handleGet, {
  endpoint: '/api/db/storage-analytics',
  method: 'GET',
  middleware: { observability: false },
});
