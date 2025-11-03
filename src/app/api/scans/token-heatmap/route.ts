import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import Database from 'better-sqlite3';

interface HeatmapQueryParams {
  projectId: string | null;
  params: string[];
}

interface HeatmapData {
  scan_type: string;
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  scan_count: number;
}

interface SummaryData {
  scan_type: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  scan_count: number;
  avg_tokens: number;
}

interface TotalsData {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_scans: number;
}

/**
 * Build heatmap query with project filter
 */
function buildHeatmapQuery(daysBack: number, queryParams: HeatmapQueryParams): string {
  let query = `
    SELECT
      scan_type,
      DATE(timestamp) as date,
      SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
      SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
      SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
      COUNT(*) as scan_count
    FROM scans
    WHERE timestamp >= datetime('now', '-${daysBack} days')
  `;

  if (queryParams.projectId && queryParams.projectId !== 'all') {
    query += ' AND project_id = ?';
    queryParams.params.push(queryParams.projectId);
  }

  query += `
    GROUP BY scan_type, DATE(timestamp)
    ORDER BY date DESC, scan_type ASC
  `;

  return query;
}

/**
 * Build summary statistics query
 */
function buildSummaryQuery(daysBack: number, queryParams: HeatmapQueryParams): string {
  let summaryQuery = `
    SELECT
      scan_type,
      SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
      SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
      SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
      COUNT(*) as scan_count,
      AVG(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as avg_tokens
    FROM scans
    WHERE timestamp >= datetime('now', '-${daysBack} days')
  `;

  if (queryParams.projectId && queryParams.projectId !== 'all') {
    summaryQuery += ' AND project_id = ?';
  }

  summaryQuery += ' GROUP BY scan_type ORDER BY total_tokens DESC';

  return summaryQuery;
}

/**
 * Build total statistics query
 */
function buildTotalsQuery(daysBack: number, queryParams: HeatmapQueryParams): string {
  let totalQuery = `
    SELECT
      SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
      SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
      SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
      COUNT(*) as total_scans
    FROM scans
    WHERE timestamp >= datetime('now', '-${daysBack} days')
  `;

  if (queryParams.projectId && queryParams.projectId !== 'all') {
    totalQuery += ' AND project_id = ?';
  }

  return totalQuery;
}

/**
 * Fetch token heatmap data from database
 */
function fetchTokenHeatmapData(
  db: Database.Database,
  daysBack: number,
  projectId: string | null
): {
  heatmapData: HeatmapData[];
  summary: SummaryData[];
  totals: TotalsData;
} {
  const queryParams: HeatmapQueryParams = {
    projectId,
    params: []
  };

  // Fetch heatmap data
  const heatmapQuery = buildHeatmapQuery(daysBack, queryParams);
  const heatmapStmt = db.prepare(heatmapQuery);
  const heatmapData = heatmapStmt.all(...queryParams.params) as HeatmapData[];

  // Reset params for summary query
  queryParams.params = [];
  if (queryParams.projectId && queryParams.projectId !== 'all') {
    queryParams.params.push(queryParams.projectId);
  }

  // Fetch summary data
  const summaryQuery = buildSummaryQuery(daysBack, queryParams);
  const summaryStmt = db.prepare(summaryQuery);
  const summary = summaryStmt.all(...queryParams.params) as SummaryData[];

  // Reset params for totals query
  queryParams.params = [];
  if (queryParams.projectId && queryParams.projectId !== 'all') {
    queryParams.params.push(queryParams.projectId);
  }

  // Fetch totals data
  const totalsQuery = buildTotalsQuery(daysBack, queryParams);
  const totalsStmt = db.prepare(totalsQuery);
  const totals = totalsStmt.get(...queryParams.params) as TotalsData;

  return { heatmapData, summary, totals };
}

/**
 * GET /api/scans/token-heatmap
 * Returns token usage data grouped by scan type and time period for heatmap visualization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const daysBack = parseInt(searchParams.get('daysBack') || '30', 10);

    const db = getDatabase();
    const { heatmapData, summary, totals } = fetchTokenHeatmapData(db, daysBack, projectId);

    return NextResponse.json({
      success: true,
      data: {
        heatmapData,
        summary,
        totals,
        daysBack,
        projectId: projectId || 'all'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch token heatmap data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
