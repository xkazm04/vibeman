import { NextRequest, NextResponse } from 'next/server';
import { analyzePreferenceHistory, classifyRejectionReason } from '@/lib/goals/preferenceLearning';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { withObservability } from '@/lib/observability/middleware';

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/goals/preference-insights?projectId=xxx
 * Returns the learned preference profile for a project's goal generation.
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    const profile = analyzePreferenceHistory(projectId);
    const stats = goalCandidateRepository.getCandidateStats(projectId);

    // Classify all rejection reasons for breakdown visibility
    const rejectedWithReasons = goalCandidateRepository.getRejectedCandidatesWithReasons(projectId, 50);
    const classifiedRejections = rejectedWithReasons.map(r => ({
      title: r.title,
      reason: r.rejection_reason,
      category: classifyRejectionReason(r.rejection_reason),
    }));

    return NextResponse.json({
      success: true,
      profile,
      stats,
      classifiedRejections,
      hasEnoughData: profile !== null,
    });
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

export const GET = withObservability(handleGet, '/api/goals/preference-insights');
