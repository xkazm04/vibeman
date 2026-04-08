/**
 * Hot-Writes Database Status API
 *
 * Returns dual-database architecture status including table row counts,
 * aggregation worker state, and write traffic metrics for the split visualization.
 *
 * GET /api/db/hot-writes-status
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';

interface TableInfo {
  name: string;
  rowCount: number;
}

interface HotWritesStatusResponse {
  mainDb: {
    tables: TableInfo[];
    sizeLabel: string;
  };
  hotWritesDb: {
    tables: TableInfo[];
    sizeLabel: string;
  };
  aggregationWorker: {
    active: boolean;
    intervalMs: number;
    retentionHours: number;
  };
  flow: {
    pendingRows: number;
    lastAggregatedTable: string;
  };
}

function getTableCount(db: any, tableName: string): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    return row.count || 0;
  } catch {
    return 0;
  }
}

export async function GET(): Promise<NextResponse<HotWritesStatusResponse>> {
  try {
    const mainDb = getDatabase();
    const hotDb = getHotWritesDatabase();

    // Main DB key tables
    const mainTables: TableInfo[] = [
      'goals', 'contexts', 'context_groups', 'events', 'scan_queue',
      'conductor_runs', 'sessions', 'learning_insights', 'brain_reflections',
      'obs_endpoint_stats', 'ideas', 'implementation_logs',
    ].map(name => ({ name, rowCount: getTableCount(mainDb, name) }));

    // Hot-writes DB tables
    const hotTables: TableInfo[] = [
      'behavioral_signals', 'obs_api_calls',
    ].map(name => ({ name, rowCount: getTableCount(hotDb, name) }));

    // Check aggregation worker is active via globalThis timer key
    const timerActive = !!(globalThis as Record<string, unknown>)['__hotWritesAggregatorTimer'];

    // Pending rows = obs_api_calls not yet aggregated (approximate)
    const pendingRows = hotTables.find(t => t.name === 'obs_api_calls')?.rowCount || 0;

    return NextResponse.json({
      mainDb: {
        tables: mainTables,
        sizeLabel: 'goals.db',
      },
      hotWritesDb: {
        tables: hotTables,
        sizeLabel: 'hot-writes.db',
      },
      aggregationWorker: {
        active: timerActive,
        intervalMs: 5 * 60 * 1000,
        retentionHours: 24,
      },
      flow: {
        pendingRows,
        lastAggregatedTable: 'obs_endpoint_stats',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      mainDb: { tables: [], sizeLabel: 'goals.db' },
      hotWritesDb: { tables: [], sizeLabel: 'hot-writes.db' },
      aggregationWorker: { active: false, intervalMs: 300000, retentionHours: 24 },
      flow: { pendingRows: 0, lastAggregatedTable: 'obs_endpoint_stats' },
    }, { status: 503 });
  }
}
