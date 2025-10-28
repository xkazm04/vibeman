import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

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

    // Build query based on project filter
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

    const params: any[] = [];

    if (projectId && projectId !== 'all') {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    query += `
      GROUP BY scan_type, DATE(timestamp)
      ORDER BY date DESC, scan_type ASC
    `;

    const stmt = db.prepare(query);
    const results = stmt.all(...params);

    // Also get summary statistics
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

    if (projectId && projectId !== 'all') {
      summaryQuery += ' AND project_id = ?';
    }

    summaryQuery += ' GROUP BY scan_type ORDER BY total_tokens DESC';

    const summaryStmt = db.prepare(summaryQuery);
    const summary = summaryStmt.all(...params);

    // Get overall totals
    let totalQuery = `
      SELECT
        SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
        SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
        SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
        COUNT(*) as total_scans
      FROM scans
      WHERE timestamp >= datetime('now', '-${daysBack} days')
    `;

    if (projectId && projectId !== 'all') {
      totalQuery += ' AND project_id = ?';
    }

    const totalStmt = db.prepare(totalQuery);
    const totals = totalStmt.get(...params);

    return NextResponse.json({
      success: true,
      data: {
        heatmapData: results,
        summary,
        totals,
        daysBack,
        projectId: projectId || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching token heatmap data:', error);
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
