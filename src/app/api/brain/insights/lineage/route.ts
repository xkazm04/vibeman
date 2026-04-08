/**
 * GET /api/brain/insights/lineage?insightId=...
 *
 * Returns the full lineage DAG for a given insight — ancestors, descendants,
 * evidence refs, influence records, and edge relationships.
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';

export async function GET(request: NextRequest) {
  const insightId = request.nextUrl.searchParams.get('insightId');

  if (!insightId) {
    return NextResponse.json({ success: false, error: 'insightId is required' }, { status: 400 });
  }

  const lineage = brainInsightRepository.getLineage(insightId);

  if (!lineage) {
    return NextResponse.json({ success: false, error: 'Insight not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...lineage });
}
