import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { SCAN_TYPES } from '@/app/features/Ideas/sub_IdeasSetup/lib/ScanTypeConfig';
import { withObservability } from '@/lib/observability/middleware';

interface StatusScanRow {
  status: string;
  scan_type: string;
  count: number;
}

interface GroupRow {
  field_value: string;
  count: number;
}

function calculateAcceptanceRatio(accepted: number, implemented: number, total: number): number {
  return total > 0 ? Math.round(((accepted + implemented) / total) * 100) : 0;
}

/**
 * GET /api/ideas/stats
 * Get idea statistics grouped by scan type
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');

    const db = getDatabase();
    const conditions: string[] = [];
    const params: string[] = [];

    if (projectId) {
      conditions.push('project_id = ?');
      params.push(projectId);
    }
    if (contextId) {
      conditions.push('context_id = ?');
      params.push(contextId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Single query: aggregate by status + scan_type
    const rows = db.prepare(
      `SELECT status, scan_type, COUNT(*) as count FROM ideas ${whereClause} GROUP BY status, scan_type`
    ).all(...params) as StatusScanRow[];

    // Build scan type stats from the aggregated rows
    const scanTypeValues = SCAN_TYPES.map(t => t.value);
    const scanTypeStats = scanTypeValues.map(scanType => {
      const scanRows = rows.filter(r => r.scan_type === scanType);
      const pending = scanRows.find(r => r.status === 'pending')?.count ?? 0;
      const accepted = scanRows.find(r => r.status === 'accepted')?.count ?? 0;
      const rejected = scanRows.find(r => r.status === 'rejected')?.count ?? 0;
      const implemented = scanRows.find(r => r.status === 'implemented')?.count ?? 0;
      const total = pending + accepted + rejected + implemented;

      return {
        scanType,
        pending,
        accepted,
        rejected,
        implemented,
        total,
        acceptanceRatio: calculateAcceptanceRatio(accepted, implemented, total),
      };
    });

    // Overall stats from the same rows
    let overallPending = 0, overallAccepted = 0, overallRejected = 0, overallImplemented = 0;
    for (const row of rows) {
      switch (row.status) {
        case 'pending': overallPending += row.count; break;
        case 'accepted': overallAccepted += row.count; break;
        case 'rejected': overallRejected += row.count; break;
        case 'implemented': overallImplemented += row.count; break;
      }
    }
    const overallTotal = overallPending + overallAccepted + overallRejected + overallImplemented;

    // Project distribution
    const projectRows = db.prepare(
      `SELECT project_id as field_value, COUNT(*) as count FROM ideas ${whereClause} GROUP BY project_id`
    ).all(...params) as GroupRow[];

    const projects = projectRows.map(r => ({
      projectId: r.field_value,
      name: r.field_value,
      totalIdeas: r.count,
    }));

    // Context distribution
    const contextWhere = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')} AND context_id IS NOT NULL`
      : 'WHERE context_id IS NOT NULL';
    const contextRows = db.prepare(
      `SELECT context_id as field_value, COUNT(*) as count FROM ideas ${contextWhere} GROUP BY context_id`
    ).all(...params) as GroupRow[];

    const contexts = contextRows.map(r => ({
      contextId: r.field_value,
      name: r.field_value,
      totalIdeas: r.count,
    }));

    return NextResponse.json({
      scanTypes: scanTypeStats,
      overall: {
        pending: overallPending,
        accepted: overallAccepted,
        rejected: overallRejected,
        implemented: overallImplemented,
        total: overallTotal,
        acceptanceRatio: calculateAcceptanceRatio(overallAccepted, overallImplemented, overallTotal),
      },
      projects,
      contexts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/ideas/stats');
