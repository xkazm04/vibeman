/**
 * GET /api/admin/route-registry
 * Returns the middleware audit registry — which routes use which middleware.
 */

import { NextResponse } from 'next/server';
import { getRouteRegistry } from '@/lib/api-helpers/createRouteHandler';

export async function GET() {
  const registry = getRouteRegistry();

  const withObservability = registry.filter(r => r.observability).length;
  const withRateLimit = registry.filter(r => r.rateLimit).length;
  const withAccessControl = registry.filter(r => r.accessControl).length;

  return NextResponse.json({
    routes: registry,
    summary: {
      total: registry.length,
      withObservability,
      withRateLimit,
      withAccessControl,
    },
  });
}
