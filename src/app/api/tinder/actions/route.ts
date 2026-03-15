/**
 * POST /api/tinder/actions
 *
 * Unified tinder action endpoint. Dispatches accept/reject/delete for
 * ideas, directions, and direction pairs through a single request shape:
 *
 *   { itemType, itemId, action, projectPath?, metadata? }
 *
 * Consolidates the 6+ branching client code paths in tinderItemsApi.ts
 * into a single call while preserving all server-side business logic
 * (rollback, ADR generation, brain signals, dependency surfacing, etc.).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ideaDb,
  directionDb,
  insightEffectivenessCache,
  brainInsightDb,
  insightInfluenceDb,
} from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { type WrapperMode } from '@/lib/prompts/requirement_file';
import { signalCollector } from '@/lib/brain/signalCollector';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { acceptIdea as acceptIdeaWorkflow } from '@/lib/ideas/ideaAcceptanceWorkflow';
import { acceptDirection as acceptDirectionWorkflow } from '@/lib/ideas/directionAcceptanceWorkflow';
import { acceptDirectionPair as acceptDirectionPairWorkflow } from '@/lib/ideas/directionPairAcceptanceWorkflow';

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

type ItemType = 'idea' | 'direction' | 'direction_pair';
type Action = 'accept' | 'reject' | 'delete';

interface TinderActionRequest {
  itemType: ItemType;
  itemId: string;
  action: Action;
  projectPath?: string;
  metadata?: {
    rejectionReason?: string;
    wrapperMode?: WrapperMode;
    /** For direction_pair accept: which variant to accept */
    variant?: 'A' | 'B';
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRequest(body: unknown): body is TinderActionRequest {
  const req = body as TinderActionRequest;
  if (!req || typeof req !== 'object') return false;
  if (!['idea', 'direction', 'direction_pair'].includes(req.itemType)) return false;
  if (typeof req.itemId !== 'string' || req.itemId.length === 0) return false;
  if (!['accept', 'reject', 'delete'].includes(req.action)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Idea actions
// ---------------------------------------------------------------------------

function acceptIdea(ideaId: string, projectPath: string, wrapperMode: WrapperMode = 'mcp') {
  const result = acceptIdeaWorkflow({ ideaId, projectPath, wrapperMode });

  if (!result.success) {
    const codeMap: Record<string, (typeof IdeasErrorCode)[keyof typeof IdeasErrorCode]> = {
      IDEA_NOT_FOUND: IdeasErrorCode.IDEA_NOT_FOUND,
      MISSING_FIELD: IdeasErrorCode.MISSING_REQUIRED_FIELD,
      BUILD_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
      WRAP_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
      DB_UPDATE_FAILED: IdeasErrorCode.UPDATE_FAILED,
      FILE_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
    };
    return createIdeasErrorResponse(
      codeMap[result.code] || IdeasErrorCode.CREATE_FAILED,
      { message: result.message },
    );
  }

  return NextResponse.json({
    success: true,
    requirementName: result.requirementName,
    prerequisites: result.prerequisites,
    unlocks: result.unlocks,
  });
}

function rejectIdea(ideaId: string, projectPath?: string, rejectionReason?: string) {
  const idea = ideaDb.getIdeaById(ideaId);
  if (!idea) return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND);

  // Delete requirement file if it exists
  if (idea.requirement_id && projectPath) {
    try { deleteRequirement(projectPath, idea.requirement_id); } catch { /* non-critical */ }
  }

  ideaDb.updateIdea(ideaId, {
    status: 'rejected',
    requirement_id: null,
    ...(rejectionReason ? { user_feedback: rejectionReason } : {}),
  });

  try {
    if (idea.project_id) {
      signalCollector.recordIdeaDecision(idea.project_id, {
        ideaId: idea.id,
        ideaTitle: idea.title || 'Untitled',
        category: idea.category || 'general',
        accepted: false,
        contextId: idea.context_id || null,
        contextName: null,
        rejectionReason: rejectionReason || null,
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}

function deleteIdea(ideaId: string) {
  const success = ideaDb.deleteIdea(ideaId);
  if (!success) return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND);
  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Direction actions
// ---------------------------------------------------------------------------

function acceptDirection(directionId: string, projectPath: string) {
  const result = acceptDirectionWorkflow({ directionId, projectPath });

  if (!result.success) {
    const codeMap: Record<string, (typeof IdeasErrorCode)[keyof typeof IdeasErrorCode]> = {
      NOT_FOUND: IdeasErrorCode.IDEA_NOT_FOUND,
      ALREADY_PROCESSED: IdeasErrorCode.IDEA_ALREADY_EXISTS,
      INTERNAL_ERROR: IdeasErrorCode.INTERNAL_ERROR,
      FILE_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
      DB_UPDATE_FAILED: IdeasErrorCode.UPDATE_FAILED,
    };
    return createIdeasErrorResponse(
      codeMap[result.code] || IdeasErrorCode.CREATE_FAILED,
      { message: result.message, details: result.details },
    );
  }

  return NextResponse.json({
    success: true,
    requirementName: result.requirementName,
    requirementPath: result.requirementPath,
  });
}

function rejectDirection(directionId: string) {
  const direction = directionDb.getDirectionById(directionId);
  if (!direction) return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction not found' });

  const rejectedDirection = directionDb.rejectDirection(directionId);
  if (!rejectedDirection) return createIdeasErrorResponse(IdeasErrorCode.UPDATE_FAILED, { message: 'Failed to reject direction' });

  try {
    signalCollector.recordContextFocus(direction.project_id, {
      contextId: direction.context_id || directionId,
      contextName: direction.context_name || direction.context_map_title,
      duration: 0,
      actions: ['reject_direction'],
    });
  } catch { /* non-critical */ }

  try {
    const activeInsights = brainInsightDb.getForEffectiveness(direction.project_id);
    if (activeInsights.length > 0) {
      const now = new Date().toISOString();
      insightInfluenceDb.recordInfluenceBatch(
        direction.project_id, directionId, 'rejected',
        activeInsights.map(i => ({ id: i.id, title: i.title, shownAt: i.completed_at || now }))
      );
    }
  } catch { /* non-critical */ }

  try { insightEffectivenessCache.invalidate(direction.project_id); } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}

function deleteDirection(directionId: string) {
  const direction = directionDb.getDirectionById(directionId);
  if (!direction) return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction not found' });

  const deleted = directionDb.deleteDirection(directionId);
  if (!deleted) return createIdeasErrorResponse(IdeasErrorCode.DELETE_FAILED, { message: 'Failed to delete direction' });

  try { insightEffectivenessCache.invalidate(direction.project_id); } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Direction pair actions
// ---------------------------------------------------------------------------

function acceptPairVariant(pairId: string, variant: 'A' | 'B', projectPath: string) {
  const result = acceptDirectionPairWorkflow({ pairId, variant, projectPath });

  if (!result.success) {
    const codeMap: Record<string, (typeof IdeasErrorCode)[keyof typeof IdeasErrorCode]> = {
      NOT_FOUND: IdeasErrorCode.IDEA_NOT_FOUND,
      ALREADY_PROCESSED: IdeasErrorCode.IDEA_ALREADY_EXISTS,
      FILE_FAILED: IdeasErrorCode.FILE_OPERATION_FAILED,
      DB_UPDATE_FAILED: IdeasErrorCode.UPDATE_FAILED,
    };
    return createIdeasErrorResponse(
      codeMap[result.code] || IdeasErrorCode.CREATE_FAILED,
      { message: result.message },
    );
  }

  return NextResponse.json({
    success: true,
    requirementName: result.requirementName,
    requirementPath: result.requirementPath,
  });
}

function rejectPair(pairId: string) {
  const rejectedCount = directionDb.rejectDirectionPair(pairId);
  if (rejectedCount === 0) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction pair not found or already processed' });
  }

  try {
    const pair = directionDb.getDirectionPair(pairId);
    const projectId = pair.directionA?.project_id || pair.directionB?.project_id;
    if (projectId) {
      const activeInsights = brainInsightDb.getForEffectiveness(projectId);
      if (activeInsights.length > 0) {
        const now = new Date().toISOString();
        const insightBatch = activeInsights.map(i => ({ id: i.id, title: i.title, shownAt: i.completed_at || now }));
        if (pair.directionA) insightInfluenceDb.recordInfluenceBatch(projectId, pair.directionA.id, 'rejected', insightBatch);
        if (pair.directionB) insightInfluenceDb.recordInfluenceBatch(projectId, pair.directionB.id, 'rejected', insightBatch);
      }
      try { insightEffectivenessCache.invalidate(projectId); } catch { /* non-critical */ }
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, rejectedCount });
}

function deletePair(pairId: string) {
  const pair = directionDb.getDirectionPair(pairId);
  const projectId = pair.directionA?.project_id || pair.directionB?.project_id;

  const deletedCount = directionDb.deleteDirectionPair(pairId);
  if (deletedCount === 0) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction pair not found' });
  }

  if (projectId) {
    try { insightEffectivenessCache.invalidate(projectId); } catch { /* non-critical */ }
  }

  return NextResponse.json({ success: true, deletedCount });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        message: 'Invalid request. Required: { itemType: "idea"|"direction"|"direction_pair", itemId: string, action: "accept"|"reject"|"delete" }',
      });
    }

    const { itemType, itemId, action, projectPath, metadata } = body;

    // Accept actions require projectPath
    if (action === 'accept' && !projectPath) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, { field: 'projectPath', message: 'projectPath is required for accept actions' });
    }

    // Pair accept requires variant
    if (itemType === 'direction_pair' && action === 'accept') {
      if (!metadata?.variant || !['A', 'B'].includes(metadata.variant)) {
        return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, { field: 'metadata.variant', message: 'metadata.variant ("A" or "B") is required for pair accept' });
      }
    }

    // Dispatch to the appropriate handler
    switch (itemType) {
      case 'idea':
        switch (action) {
          case 'accept': return acceptIdea(itemId, projectPath!, metadata?.wrapperMode);
          case 'reject': return rejectIdea(itemId, projectPath, metadata?.rejectionReason);
          case 'delete': return deleteIdea(itemId);
        }
        break;

      case 'direction':
        switch (action) {
          case 'accept': return acceptDirection(itemId, projectPath!);
          case 'reject': return rejectDirection(itemId);
          case 'delete': return deleteDirection(itemId);
        }
        break;

      case 'direction_pair':
        switch (action) {
          case 'accept': return acceptPairVariant(itemId, metadata!.variant!, projectPath!);
          case 'reject': return rejectPair(itemId);
          case 'delete': return deletePair(itemId);
        }
        break;
    }

    return createIdeasErrorResponse(IdeasErrorCode.INVALID_ACTION, { message: 'Unknown action' });
  } catch (error) {
    return handleIdeasApiError(error);
  }
}

export const POST = withObservability(
  withRateLimit(handlePost, '/api/tinder/actions', 'strict'),
  '/api/tinder/actions'
);
