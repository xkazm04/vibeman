/**
 * API Route: Accept Direction
 *
 * POST /api/directions/[id]/accept
 * Accepts a direction and creates a Claude Code requirement file for implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, scanDb, ideaDb, insightEffectivenessCache, brainInsightDb, insightInfluenceDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { signalCollector } from '@/lib/brain/signalCollector';
import { generateAdr } from '@/lib/directions/adrGenerator';

/**
 * Create a slug from the first 5 words of a title
 */
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

/**
 * Build the Claude Code requirement content from an accepted direction
 */
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

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Atomically claim the direction for processing (prevents double-click duplicates)
    // This uses a conditional UPDATE that only succeeds if status is 'pending'
    const claimed = directionDb.claimDirectionForProcessing(id);

    if (!claimed) {
      // Direction was not in 'pending' status - either doesn't exist or already being processed
      const direction = directionDb.getDirectionById(id);
      if (!direction) {
        return NextResponse.json(
          { error: 'Direction not found' },
          { status: 404 }
        );
      }
      // Direction exists but is already processed or being processed.
      // Return the existing direction data so clients can handle idempotently.
      return NextResponse.json(
        {
          error: 'Direction has already been processed',
          direction,
          requirementName: direction.requirement_id ?? '',
          requirementPath: direction.requirement_path ?? '',
        },
        { status: 409 }
      );
    }

    // Fetch the direction now that we've claimed it
    const direction = directionDb.getDirectionById(id);

    if (!direction) {
      // Shouldn't happen since we just claimed it, but handle gracefully
      return NextResponse.json(
        { error: 'Direction not found after claim' },
        { status: 500 }
      );
    }

    // Generate requirement name and content
    const timestamp = Date.now();
    const titleSlug = createTitleSlug(direction.summary);
    const requirementId = `dir-${timestamp}-${titleSlug}`;
    const requirementContent = buildImplementationRequirement({
      direction: direction.direction,
      summary: direction.summary,
      context_map_title: direction.context_map_title
    });

    // Create the requirement file
    const result = createRequirement(projectPath, requirementId, requirementContent, true);

    if (!result.success) {
      // Rollback: reset direction from 'processing' back to 'pending' so user can retry
      directionDb.updateDirection(id, { status: 'pending' });
      logger.error('[API] Requirement file creation failed, rolled back direction to pending:', {
        directionId: id,
        requirementId,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error || 'Failed to create requirement file. Direction has been reset — you can retry.' },
        { status: 500 }
      );
    }

    // Generate Architecture Decision Record
    const adr = generateAdr({
      summary: direction.summary,
      direction: direction.direction,
      contextMapTitle: direction.context_map_title,
      problemStatement: direction.problem_statement,
    });
    const decisionRecordJson = JSON.stringify(adr);

    // Update direction with requirement info and ADR
    const updatedDirection = directionDb.acceptDirection(
      id,
      requirementId,
      result.filePath || '',
      decisionRecordJson
    );

    if (!updatedDirection) {
      logger.error('[API] Failed to update direction status after requirement creation:', {
        directionId: id,
        requirementId,
        requirementPath: result.filePath,
      });
      return NextResponse.json(
        { error: 'Failed to update direction status. Requirement file was created but direction state is inconsistent.' },
        { status: 500 }
      );
    }

    // Create a scan record for tracking (required for ideas)
    const scanId = uuidv4();
    scanDb.createScan({
      id: scanId,
      project_id: direction.project_id,
      scan_type: 'direction_accepted',
      summary: `Direction accepted: ${direction.summary}`
    });

    // Create an idea record to link direction to the Ideas System
    // This ensures implementations flow through the standard Ideas -> TaskRunner pipeline
    const ideaId = uuidv4();
    const idea = ideaDb.createIdea({
      id: ideaId,
      scan_id: scanId,
      project_id: direction.project_id,
      context_id: direction.context_id || null,
      scan_type: 'direction_accepted',
      category: 'direction',
      title: direction.summary,
      description: direction.direction,
      reasoning: `Auto-generated from accepted direction in context: ${direction.context_map_title}`,
      status: 'accepted',
      requirement_id: requirementId
    });

    logger.info('[API] Direction accepted and requirement created:', {
      directionId: id,
      requirementId,
      requirementPath: result.filePath,
      ideaId: idea.id
    });

    // Record brain signal: direction accepted
    try {
      signalCollector.recordImplementation(direction.project_id, {
        requirementId,
        requirementName: requirementId,
        directionId: id,
        contextId: direction.context_id || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
    } catch {
      // Signal recording must never break the main flow
    }

    // Invalidate effectiveness cache since direction data changed
    try { insightEffectivenessCache.invalidate(direction.project_id); } catch { /* non-critical */ }

    // Record insight influence for causal validation
    // Captures which insights were active when this direction was accepted
    try {
      const activeInsights = brainInsightDb.getForEffectiveness(direction.project_id);
      if (activeInsights.length > 0) {
        const now = new Date().toISOString();
        insightInfluenceDb.recordInfluenceBatch(
          direction.project_id,
          id,
          'accepted',
          activeInsights.map(i => ({
            id: i.id,
            title: i.title,
            shownAt: i.completed_at || now,
          }))
        );
      }
    } catch {
      // Influence tracking must never break the main flow
    }

    return NextResponse.json({
      success: true,
      direction: updatedDirection,
      requirementName: requirementId,
      requirementPath: result.filePath,
      ideaId: idea.id
    });

  } catch (error) {
    logger.error('[API] Direction accept error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(withRateLimit(handlePost, '/api/directions/[id]/accept', 'strict'), '/api/directions/[id]/accept');
