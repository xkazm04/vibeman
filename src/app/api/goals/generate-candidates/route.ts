import { NextRequest, NextResponse } from 'next/server';
import { generateGoalCandidates } from '@/lib/goalGenerator';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { randomUUID } from 'crypto';

/**
 * POST /api/goals/generate-candidates
 * Generate goal candidates using LLM
 */
export async function POST(request: NextRequest) {
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

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { error: 'Project ID and path are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: result.error || 'Failed to generate goal candidates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidates: result.candidates,
      candidateIds: result.candidateIds,
      totalGenerated: result.totalGenerated,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error in POST /api/goals/generate-candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/goals/generate-candidates?projectId=xxx
 * Get all goal candidates for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userAction = searchParams.get('userAction') as 'pending' | 'accepted' | 'rejected' | 'tweaked' | null;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
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
    console.error('Error in GET /api/goals/generate-candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/goals/generate-candidates
 * Update a goal candidate (e.g., accept, reject, tweak)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, action, updates } = body;

    if (!candidateId || !action) {
      return NextResponse.json(
        { error: 'Candidate ID and action are required' },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'accept') {
      // Get the candidate
      const candidate = goalCandidateRepository.getCandidateById(candidateId);

      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        );
      }

      // Get next order index for the project
      const maxOrderIndex = goalRepository.getMaxOrderIndex(candidate.project_id);

      // Create the goal from the candidate
      const goal = goalRepository.createGoal({
        id: randomUUID(),
        project_id: candidate.project_id,
        context_id: candidate.context_id || undefined,
        title: updates?.title || candidate.title,
        description: updates?.description || candidate.description || undefined,
        status: candidate.suggested_status,
        order_index: maxOrderIndex + 1
      });

      // Update the candidate with accepted status and link to goal
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
    } else if (action === 'reject') {
      const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
        user_action: 'rejected'
      });

      return NextResponse.json({
        success: true,
        candidate: updatedCandidate
      });
    } else if (action === 'tweak') {
      // User wants to edit before accepting
      const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
        user_action: 'tweaked',
        ...updates
      });

      return NextResponse.json({
        success: true,
        candidate: updatedCandidate
      });
    } else if (action === 'update') {
      // General update
      const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, updates);

      return NextResponse.json({
        success: true,
        candidate: updatedCandidate
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in PUT /api/goals/generate-candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/generate-candidates?candidateId=xxx
 * Delete a goal candidate
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const projectId = searchParams.get('projectId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll && projectId) {
      // Delete all pending candidates for the project
      const deletedCount = goalCandidateRepository.deleteCandidatesByProject(projectId, 'pending');

      return NextResponse.json({
        success: true,
        deletedCount
      });
    } else if (candidateId) {
      const success = goalCandidateRepository.deleteCandidate(candidateId);

      if (!success) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Candidate ID or Project ID with deleteAll flag is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/goals/generate-candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
