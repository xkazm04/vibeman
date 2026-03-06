/**
 * GET /api/db/performance
 *
 * Query performance profiler dashboard endpoint.
 * Returns slow queries, write contention, index suggestions,
 * and API route correlations — all from collected query patterns.
 *
 * Query params:
 *   ?projectId=<id>       — project to profile (defaults to 'default')
 *   ?slowQueryLimit=<n>   — number of slow queries to return (default 10)
 *   ?routeLimit=<n>       — number of route correlations to return (default 15)
 *   ?section=<name>       — optional: return only one section
 *       'overview' | 'slow_queries' | 'contention' | 'indexes' | 'routes'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { profileQueryPerformance } from '@/lib/db/performanceProfiler';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';

type Section = 'overview' | 'slow_queries' | 'contention' | 'indexes' | 'routes';

async function handleGet(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'default';
  const slowQueryLimit = Math.min(parseInt(searchParams.get('slowQueryLimit') || '10', 10) || 10, 50);
  const routeLimit = Math.min(parseInt(searchParams.get('routeLimit') || '15', 10) || 15, 50);
  const section = searchParams.get('section') as Section | null;

  try {
    const profile = profileQueryPerformance(projectId, { slowQueryLimit, routeLimit });

    if (section) {
      switch (section) {
        case 'overview':
          return NextResponse.json({ overview: profile.overview, analyzedAt: profile.analyzedAt });
        case 'slow_queries':
          return NextResponse.json({ slowQueries: profile.slowQueries });
        case 'contention':
          return NextResponse.json({ tableContention: profile.tableContention });
        case 'indexes':
          return NextResponse.json({ indexSuggestions: profile.indexSuggestions });
        case 'routes':
          return NextResponse.json({ routeCorrelations: profile.routeCorrelations });
        default:
          return NextResponse.json(
            { error: `Unknown section: ${section}. Valid: overview, slow_queries, contention, indexes, routes` },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        {
          error: 'Query patterns table not found. Database migrations may need to run.',
          code: 'TABLE_MISSING',
        },
        { status: 503 }
      );
    }
    throw error;
  }
}

export const GET = createRouteHandler(handleGet, {
  endpoint: '/api/db/performance',
  method: 'GET',
  middleware: { observability: false }, // Don't track ourselves
});
