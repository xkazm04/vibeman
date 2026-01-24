import { NextRequest, NextResponse } from 'next/server';
import { generateGoalCandidates } from '@/lib/goalGenerator';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { randomUUID } from 'crypto';
import { withObservability } from '@/lib/observability/middleware';

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
    });
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
    });
  } catch (error) {
    return createErrorResponse('Internal server error', 500);
  }
}

function handleAcceptAction(candidateId: string, updates: any) {
  const candidate = goalCandidateRepository.getCandidateById(candidateId);

  if (!candidate) {
    return createErrorResponse('Candidate not found', 404);
  }

  const maxOrderIndex = goalRepository.getMaxOrderIndex(candidate.project_id);

  const goal = goalRepository.createGoal({
    id: randomUUID(),
    project_id: candidate.project_id,
    context_id: candidate.context_id || undefined,
    title: updates?.title || candidate.title,
    description: updates?.description || candidate.description || undefined,
    status: candidate.suggested_status,
    order_index: maxOrderIndex + 1
  });

  const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
    user_action: 'accepted',
    goal_id: goal.id,
    title: updates?.title,
    description: updates?.description
  });

  return NextResponse.json({
    success: true,
    candidate: updatedCandidate,
    goal
  });
}

function handleRejectAction(candidateId: string) {
  const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
    user_action: 'rejected'
  });

  return NextResponse.json({
    success: true,
    candidate: updatedCandidate
  });
}

function handleTweakAction(candidateId: string, updates: any) {
  const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
    user_action: 'tweaked',
    ...updates
  });

  return NextResponse.json({
    success: true,
    candidate: updatedCandidate
  });
}

function handleUpdateAction(candidateId: string, updates: any) {
  const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, updates);

  return NextResponse.json({
    success: true,
    candidate: updatedCandidate
  });
}

/**
 * PUT /api/goals/generate-candidates
 * Update a goal candidate (e.g., accept, reject, tweak)
 */
async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, action, updates } = body;

    if (!candidateId || !action) {
      return createErrorResponse('Candidate ID and action are required', 400);
    }

    switch (action) {
      case 'accept':
        return handleAcceptAction(candidateId, updates);
      case 'reject':
        return handleRejectAction(candidateId);
      case 'tweak':
        return handleTweakAction(candidateId, updates);
      case 'update':
        return handleUpdateAction(candidateId, updates);
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
  });
}

function handleDeleteSingle(candidateId: string) {
  const success = goalCandidateRepository.deleteCandidate(candidateId);

  if (!success) {
    return createErrorResponse('Candidate not found', 404);
  }

  return NextResponse.json({ success: true });
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
