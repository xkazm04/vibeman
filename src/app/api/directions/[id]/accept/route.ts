/**
 * API Route: Accept Direction
 *
 * POST /api/directions/[id]/accept
 * Accepts a direction and creates a Claude Code requirement file for implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(
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

    // Get the direction
    const direction = directionDb.getDirectionById(id);

    if (!direction) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    if (direction.status !== 'pending') {
      return NextResponse.json(
        { error: 'Direction has already been processed' },
        { status: 400 }
      );
    }

    // Generate requirement name and content
    const timestamp = Date.now();
    const requirementId = `direction-impl-${timestamp}`;
    const requirementContent = buildImplementationRequirement({
      direction: direction.direction,
      summary: direction.summary,
      context_map_title: direction.context_map_title
    });

    // Create the requirement file
    const result = createRequirement(projectPath, requirementId, requirementContent, true);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create requirement file' },
        { status: 500 }
      );
    }

    // Update direction with requirement info
    const updatedDirection = directionDb.acceptDirection(
      id,
      requirementId,
      result.filePath || ''
    );

    if (!updatedDirection) {
      return NextResponse.json(
        { error: 'Failed to update direction status' },
        { status: 500 }
      );
    }

    logger.info('[API] Direction accepted and requirement created:', {
      directionId: id,
      requirementId,
      requirementPath: result.filePath
    });

    return NextResponse.json({
      success: true,
      direction: updatedDirection,
      requirementName: requirementId,
      requirementPath: result.filePath
    });

  } catch (error) {
    logger.error('[API] Direction accept error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
