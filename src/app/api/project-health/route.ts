/**
 * API Route: Project Health
 *
 * GET  /api/project-health?projectId= — latest snapshot + status
 * POST /api/project-health — trigger recalculation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getLatestSnapshot,
  calculateAndStore,
} from '@/lib/metrics/projectHealthEngine';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const snapshot = getLatestSnapshot(projectId);
  if (!snapshot) {
    return NextResponse.json({ data: null, message: 'No health data yet. POST to trigger calculation.' });
  }

  return NextResponse.json({ data: snapshot });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId as string | undefined;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const snapshot = calculateAndStore(projectId);
  return NextResponse.json({ data: snapshot });
}
