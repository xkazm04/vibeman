/**
 * API Route: Pull Requests
 *
 * GET /api/pull-requests?projectId=&goalId= — list PRs with optional goal filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { pullRequestRepository } from '@/app/db/repositories/pull-request.repository';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const goalId = request.nextUrl.searchParams.get('goalId');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  if (goalId) {
    const prs = pullRequestRepository.getByGoal(goalId);
    return NextResponse.json({ data: prs });
  }

  if (!projectId) {
    return NextResponse.json({ error: 'projectId or goalId required' }, { status: 400 });
  }

  const prs = pullRequestRepository.getByProject(projectId, limit);
  const counts = pullRequestRepository.getCountsByGoal(projectId);

  return NextResponse.json({ data: { pullRequests: prs, goalCounts: counts } });
}
