/**
 * Bridge API - Assign Ideas to Batch
 * POST: Assign accepted ideas to a batch
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { BatchAssignRequest } from '@/lib/bridge/types';
import { ideaRepository } from '@/app/db/repositories/idea.repository';

const VALID_BATCH_IDS = ['batch1', 'batch2', 'batch3', 'batch4'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const { id: batchId } = await params;
    const body: BatchAssignRequest = await request.json();
    const { ideaIds } = body;

    if (!VALID_BATCH_IDS.includes(batchId)) {
      return bridgeErrorResponse('Invalid batch ID. Must be: batch1, batch2, batch3, or batch4', 400);
    }

    if (!ideaIds || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return bridgeErrorResponse('ideaIds array is required', 400);
    }

    // Validate that all ideas exist and are accepted
    const validTaskIds: string[] = [];
    const errors: string[] = [];

    for (const ideaId of ideaIds) {
      const idea = ideaRepository.getIdeaById(ideaId);

      if (!idea) {
        errors.push(`Idea ${ideaId} not found`);
        continue;
      }

      if (idea.status !== 'accepted') {
        errors.push(`Idea ${ideaId} is not accepted (status: ${idea.status})`);
        continue;
      }

      if (!idea.requirement_id) {
        errors.push(`Idea ${ideaId} has no requirement file`);
        continue;
      }

      // Task ID format: projectId:requirementName
      const taskId = `${idea.project_id}:${idea.requirement_id}`;
      validTaskIds.push(taskId);
    }

    if (validTaskIds.length === 0) {
      return bridgeErrorResponse(`No valid ideas to assign: ${errors.join(', ')}`, 400);
    }

    // Return instruction for client-side batch assignment
    return bridgeSuccessResponse({
      success: true,
      instruction: 'addTasksToBatch',
      params: {
        batchId,
        taskIds: validTaskIds,
      },
      assigned: validTaskIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Assign ${validTaskIds.length} tasks to ${batchId} using TaskRunner store`,
    });
  } catch (error) {
    console.error('[Bridge/Batches] Assign error:', error);
    return bridgeErrorResponse('Failed to assign ideas to batch', 500);
  }
}
