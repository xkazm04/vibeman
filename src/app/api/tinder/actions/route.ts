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
  scanDb,
  insightEffectivenessCache,
  brainInsightDb,
  insightInfluenceDb,
  directionPreferenceDb,
} from '@/app/db';
import { createRequirement, deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { type WrapperMode } from '@/lib/prompts/requirement_file';
import { generateAdr, generatePairedAdr } from '@/lib/directions/adrGenerator';
import { signalCollector } from '@/lib/brain/signalCollector';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { acceptIdea as acceptIdeaWorkflow } from '@/lib/ideas/ideaAcceptanceWorkflow';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

function createTitleSlug(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildImplementationRequirement(direction: {
  direction: string;
  summary: string;
  context_map_title: string;
}): string {
  return `# Implementation: ${direction.summary}

## Context Area
${direction.context_map_title}

## Description
${direction.summary}

## Implementation Details

${direction.direction}

## Instructions

1. Read and understand the implementation details above
2. Identify all files that need to be modified
3. Implement the changes following the guidance provided
4. Ensure code quality and type safety
5. Test the changes work as expected

## Notes

This requirement was generated from an accepted Development Direction.
Focus on implementing exactly what is described above.
`;
}

function acceptDirection(directionId: string, projectPath: string) {
  const claimed = directionDb.claimDirectionForProcessing(directionId);
  if (!claimed) {
    const direction = directionDb.getDirectionById(directionId);
    if (!direction) return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction not found' });
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_ALREADY_EXISTS, {
      message: 'Direction has already been processed',
      details: direction.requirement_id ?? '',
    });
  }

  const direction = directionDb.getDirectionById(directionId);
  if (!direction) return createIdeasErrorResponse(IdeasErrorCode.INTERNAL_ERROR, { message: 'Direction not found after claim' });

  const titleSlug = createTitleSlug(direction.summary);
  const requirementId = `dir-${Date.now()}-${titleSlug}`;
  const requirementContent = buildImplementationRequirement({
    direction: direction.direction,
    summary: direction.summary,
    context_map_title: direction.context_map_title,
  });

  const result = createRequirement(projectPath, requirementId, requirementContent, true);
  if (!result.success) {
    directionDb.updateDirection(directionId, { status: 'pending' });
    return createIdeasErrorResponse(IdeasErrorCode.FILE_OPERATION_FAILED, { message: result.error || 'Failed to create requirement file' });
  }

  const adr = generateAdr({
    summary: direction.summary,
    direction: direction.direction,
    contextMapTitle: direction.context_map_title,
    problemStatement: direction.problem_statement,
  });

  const updatedDirection = directionDb.acceptDirection(directionId, requirementId, result.filePath || '', JSON.stringify(adr));
  if (!updatedDirection) {
    return createIdeasErrorResponse(IdeasErrorCode.UPDATE_FAILED, { message: 'Failed to update direction status' });
  }

  // Create scan + idea records
  const scanId = uuidv4();
  scanDb.createScan({ id: scanId, project_id: direction.project_id, scan_type: 'direction_accepted', summary: `Direction accepted: ${direction.summary}` });
  const ideaId = uuidv4();
  ideaDb.createIdea({
    id: ideaId, scan_id: scanId, project_id: direction.project_id,
    context_id: direction.context_id || null, scan_type: 'direction_accepted',
    category: 'direction', title: direction.summary, description: direction.direction,
    reasoning: `Auto-generated from accepted direction in context: ${direction.context_map_title}`,
    status: 'accepted', requirement_id: requirementId,
  });

  // Brain signals + effectiveness
  try {
    signalCollector.recordImplementation(direction.project_id, {
      requirementId, requirementName: requirementId, directionId,
      contextId: direction.context_id || null,
      filesCreated: [], filesModified: [], filesDeleted: [],
      success: true, executionTimeMs: 0,
    });
  } catch { /* non-critical */ }

  try { insightEffectivenessCache.invalidate(direction.project_id); } catch { /* non-critical */ }

  try {
    const activeInsights = brainInsightDb.getForEffectiveness(direction.project_id);
    if (activeInsights.length > 0) {
      const now = new Date().toISOString();
      insightInfluenceDb.recordInfluenceBatch(
        direction.project_id, directionId, 'accepted',
        activeInsights.map(i => ({ id: i.id, title: i.title, shownAt: i.completed_at || now }))
      );
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: true,
    requirementName: requirementId,
    requirementPath: result.filePath,
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
  const pair = directionDb.getDirectionPair(pairId);
  if (!pair.directionA || !pair.directionB) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, { message: 'Direction pair not found or incomplete' });
  }

  const selectedDirection = variant === 'A' ? pair.directionA : pair.directionB;
  const rejectedDirection = variant === 'A' ? pair.directionB : pair.directionA;

  const claimed = directionDb.claimDirectionForProcessing(selectedDirection.id);
  if (!claimed) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_ALREADY_EXISTS, { message: 'Direction pair has already been processed' });
  }

  // Create requirement file
  const normalizedProjectPath = path.normalize(projectPath);
  const requirementsDir = path.join(normalizedProjectPath, '.claude', 'requirements');
  if (!fs.existsSync(requirementsDir)) {
    fs.mkdirSync(requirementsDir, { recursive: true });
  }

  const requirementId = `direction-${uuidv4().slice(0, 8)}`;
  const requirementPath = path.join(requirementsDir, `${requirementId}.md`);

  const problemContext = selectedDirection.problem_statement
    ? `## Problem Statement\n\n${selectedDirection.problem_statement}\n\n`
    : '';

  const requirementContent = `# Direction: ${selectedDirection.summary}

${problemContext}## Implementation Details

${selectedDirection.direction}

---

**Context**: ${selectedDirection.context_map_title}
**Generated**: ${new Date().toISOString()}
**Selected Variant**: ${variant} (rejected alternative: ${rejectedDirection.summary})
`;

  try {
    fs.writeFileSync(requirementPath, requirementContent, 'utf-8');
  } catch {
    directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
    return createIdeasErrorResponse(IdeasErrorCode.FILE_OPERATION_FAILED, { message: 'Failed to create requirement file' });
  }

  const adr = generatePairedAdr({
    summary: selectedDirection.summary,
    direction: selectedDirection.direction,
    contextMapTitle: selectedDirection.context_map_title,
    problemStatement: selectedDirection.problem_statement,
    rejectedSummary: rejectedDirection.summary,
    rejectedDirection: rejectedDirection.direction,
    selectedVariant: variant,
  });

  const result = directionDb.acceptPairedDirection(selectedDirection.id, requirementId, requirementPath, JSON.stringify(adr));
  if (!result.accepted) {
    try { fs.unlinkSync(requirementPath); } catch { /* best-effort */ }
    directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
    return createIdeasErrorResponse(IdeasErrorCode.UPDATE_FAILED, { message: 'Failed to update direction status' });
  }

  try { insightEffectivenessCache.invalidate(selectedDirection.project_id); } catch { /* non-critical */ }
  try { directionPreferenceDb.invalidate(selectedDirection.project_id); } catch { /* non-critical */ }

  try {
    const activeInsights = brainInsightDb.getForEffectiveness(selectedDirection.project_id);
    if (activeInsights.length > 0) {
      const now = new Date().toISOString();
      const insightBatch = activeInsights.map(i => ({ id: i.id, title: i.title, shownAt: i.completed_at || now }));
      insightInfluenceDb.recordInfluenceBatch(selectedDirection.project_id, selectedDirection.id, 'accepted', insightBatch);
      insightInfluenceDb.recordInfluenceBatch(rejectedDirection.project_id, rejectedDirection.id, 'rejected', insightBatch);
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: true,
    requirementName: requirementId,
    requirementPath,
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
