/**
 * @route /api/ideas/scan-types
 * GET - Distinct scan types with counts (tinderItemsApi)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';

interface ScanTypeCount {
  scan_type: string;
  count: number;
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status') || 'pending';

  const db = getDatabase();

  let query = `
    SELECT COALESCE(scan_type, 'overall') as scan_type, COUNT(*) as count
    FROM ideas
    WHERE status = ?
  `;
  const params: (string | null)[] = [status];

  if (projectId && projectId !== 'all') {
    query += ' AND project_id = ?';
    params.push(projectId);
  }

  query += ' GROUP BY scan_type ORDER BY count DESC, scan_type ASC';

  const stmt = db.prepare(query);
  const results = stmt.all(...params) as ScanTypeCount[];

  return NextResponse.json({
    scanTypes: results,
    total: results.reduce((sum, st) => sum + st.count, 0),
  });
}

export const GET = createRouteHandler(handleGet, { endpoint: '/api/ideas/scan-types' });
