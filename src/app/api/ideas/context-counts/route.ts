/**
 * GET /api/ideas/context-counts
 * Returns context_id values with counts and names for pending ideas
 * Used for the Tinder context filter sidebar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';

interface ContextCount {
  context_id: string | null;
  context_name: string;
  count: number;
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status') || 'pending';

  const db = getDatabase();

  let query = `
    SELECT
      i.context_id,
      COALESCE(c.name, 'Unassigned') as context_name,
      COUNT(*) as count
    FROM ideas i
    LEFT JOIN contexts c ON i.context_id = c.id
    WHERE i.status = ?
  `;
  const params: (string | null)[] = [status];

  if (projectId && projectId !== 'all') {
    query += ' AND i.project_id = ?';
    params.push(projectId);
  }

  query += ' GROUP BY i.context_id ORDER BY count DESC, context_name ASC';

  const stmt = db.prepare(query);
  const results = stmt.all(...params) as ContextCount[];

  return NextResponse.json({
    contexts: results,
    total: results.reduce((sum, ctx) => sum + ctx.count, 0),
  });
}

export const GET = createRouteHandler(handleGet, { endpoint: '/api/ideas/context-counts' });
