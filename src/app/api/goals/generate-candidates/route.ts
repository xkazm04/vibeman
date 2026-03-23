import { NextRequest, NextResponse } from 'next/server';
import { generateGoalCandidates } from '@/lib/goalGenerator';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { acceptCandidate, rejectCandidate, tweakCandidate } from '@/lib/goals/goalService';
import { withObservability } from '@/lib/observability/middleware';
import type {
  GenerateCandidatesResponse,
  CandidatesListResponse,
  CandidateAcceptResponse,
  CandidateUpdateResponse,
  CandidatesBulkDeleteResponse,
  CandidateDeleteResponse,
} from '@/lib/api-types/goals';

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validateProjectRequest(projectId: string | undefined, projectPath: string | undefined): boolean {
  return !!(projectId && projectPath);
}

/**
 * POST /api/goals/generate-candidates
 * Generate goal candidates using LLM
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectPath,
      provider,
      model,
      scanDepth = 'standard',
      includeSources = ['repository', 'tech_debt', 'ideas'],
      maxCandidates = 10
    } = body;

    if (!validateProjectRequest(projectId, projectPath)) {
      return createErrorResponse('Project ID and path are required', 400);
    }

    const result = await generateGoalCandidates({
      projectId,
      projectPath,
      provider,
      model,
      scanDepth,
      includeSources,
      maxCandidates
    });

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to generate goal candidates', 500);
    }

    return NextResponse.json({
      success: true,
      candidates: result.candidates,
      candidateIds: result.candidateIds,
      totalGenerated: result.totalGenerated,
      metadata: result.metadata
    } satisfies GenerateCandidatesResponse);
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/goals/generate-candidates?projectId=xxx
 * Get all goal candidates for a project
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userAction = searchParams.get('userAction') as 'pending' | 'accepted' | 'rejected' | 'tweaked' | null;

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    const candidates = goalCandidateRepository.getCandidatesByProject(
      projectId,
      userAction || undefined
    );

    const stats = goalCandidateRepository.getCandidateStats(projectId);

    return NextResponse.json({
      success: true,
      candidates,
      stats
    } satisfies CandidatesListResponse);
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * PUT /api/goals/generate-candidates
 * Update a goal candidate (e.g., accept, reject, tweak)
 */
async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, action, updates, rejectionReason } = body;

    if (!candidateId || !action) {
      return createErrorResponse('Candidate ID and action are required', 400);
    }

    switch (action) {
      case 'accept': {
        const result = acceptCandidate(candidateId, updates);
        if (!result) return createErrorResponse('Candidate not found', 404);
        return NextResponse.json({
          success: true,
          candidate: result.updatedCandidate,
          goal: result.goal,
        } satisfies CandidateAcceptResponse);
      }
      case 'reject': {
        const updatedCandidate = rejectCandidate(candidateId, rejectionReason);
        return NextResponse.json({
          success: true,
          candidate: updatedCandidate,
        } satisfies CandidateUpdateResponse);
      }
      case 'tweak': {
        const updatedCandidate = tweakCandidate(candidateId, updates);
        return NextResponse.json({
          success: true,
          candidate: updatedCandidate,
        } satisfies CandidateUpdateResponse);
      }
      case 'update': {
        const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, updates);
        return NextResponse.json({
          success: true,
          candidate: updatedCandidate,
        } satisfies CandidateUpdateResponse);
      }
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

function handleDeleteAll(projectId: string) {
  const deletedCount = goalCandidateRepository.deleteCandidatesByProject(projectId, 'pending');
  return NextResponse.json({
    success: true,
    deletedCount
  } satisfies CandidatesBulkDeleteResponse);
}

function handleDeleteSingle(candidateId: string) {
  const success = goalCandidateRepository.deleteCandidate(candidateId);

  if (!success) {
    return createErrorResponse('Candidate not found', 404);
  }

  return NextResponse.json({ success: true } satisfies CandidateDeleteResponse);
}

/**
 * DELETE /api/goals/generate-candidates?candidateId=xxx
 * Delete a goal candidate
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const projectId = searchParams.get('projectId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll && projectId) {
      return handleDeleteAll(projectId);
    } else if (candidateId) {
      return handleDeleteSingle(candidateId);
    } else {
      return createErrorResponse('Candidate ID or Project ID with deleteAll flag is required', 400);
    }
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

export const POST = withObservability(handlePost, '/api/goals/generate-candidates');
export const GET = withObservability(handleGet, '/api/goals/generate-candidates');
export const PUT = withObservability(handlePut, '/api/goals/generate-candidates');
export const DELETE = withObservability(handleDelete, '/api/goals/generate-candidates');
